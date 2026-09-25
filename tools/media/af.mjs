// Encode a folder of stills (wayNNN.jpg) into an ActiveFrame-style .af file.
//
// Container (compatible with github.com/activetheory/activeframe):
//   [encoded samples back to back][JSON manifest][uint32 LE: manifest offset]
// One still = one frame. Frames are stored in order, so a player can start
// decoding while the file is still downloading, given the frame offsets up
// front (encode-v2.mjs writes them to index.json for that).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFile, DataStream } from 'mp4box';

export const FPS = 30; // only spaces the timestamps; playback is driven by position

const CODEC_ARGS = {
    // No B-frames and a single reference keep decode order == display order,
    // so any frame can be reached by decoding forward from its keyframe.
    h264: (crf) => ['-c:v', 'libx264', '-tag:v', 'avc1', '-profile:v', 'main', '-preset', 'slower',
        '-refs', '1', '-bf', '0', '-crf', String(crf)],
    vp9: (crf) => ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf), '-row-mt', '1',
        '-deadline', 'good', '-cpu-used', '4', '-auto-alt-ref', '0', '-lag-in-frames', '0'],
    av1: (crf) => ['-c:v', 'libaom-av1', '-b:v', '0', '-crf', String(crf), '-cpu-used', '6',
        '-lag-in-frames', '0', '-row-mt', '1'],
};

export const DEFAULT_CRF = { h264: 29, vp9: 50, av1: 45 };

function ffmpegPath() {
    return process.env.FFMPEG || 'ffmpeg';
}

// SSIM of an encoded mp4 against a reference sequence, compared at 1000px wide.
function ssim(mp4, refDir) {
    const q = spawnSync(ffmpegPath(), [
        '-i', mp4, '-framerate', String(FPS), '-i', path.join(refDir, 'way%03d.jpg'),
        '-lavfi', '[1:v]scale=1000:-2:flags=bicubic[ref];[0:v][ref]scale2ref=flags=bicubic[a][b];[a][b]ssim',
        '-f', 'null', '-',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    const m = /All:([0-9.]+)/.exec(q.stderr.toString());
    return m ? Number(m[1]) : null;
}

function demux(mp4Buffer) {
    return new Promise((resolve, reject) => {
        const ab = mp4Buffer.buffer.slice(mp4Buffer.byteOffset, mp4Buffer.byteOffset + mp4Buffer.byteLength);
        ab.fileStart = 0;
        const mp4 = createFile();
        mp4.onError = reject;
        mp4.onReady = (info) => {
            const track = info.videoTracks[0];
            const entry = mp4.getTrackById(track.id).mdia.minf.stbl.stsd.entries[0];
            // H.264/H.265 decoders need the avcC/hvcC record as `description`; VP9/AV1 don't
            let description = null;
            const box = entry.avcC || entry.hvcC;
            if (box) {
                const ds = new DataStream(null, 0, DataStream.BIG_ENDIAN);
                box.write(ds);
                description = Buffer.from(new Uint8Array(ds.buffer, 8)).toString('base64'); // skip box header
            }
            const chunks = [];
            const frames = [];
            let offset = 0;
            mp4.onSamples = (id, user, samples) => {
                for (const s of samples) {
                    const data = Buffer.from(s.data);
                    chunks.push(data);
                    frames.push({
                        o: offset,
                        l: data.length,
                        t: Math.round((s.cts / s.timescale) * 1e6),
                        ty: s.is_sync ? 'key' : 'delta',
                        i: frames.length,
                    });
                    offset += data.length;
                }
                if (frames.length === track.nb_samples) {
                    resolve({ track, description, chunks, frames, dataBytes: offset });
                }
            };
            mp4.setExtractionOptions(track.id, null, { nbSamples: track.nb_samples });
            mp4.start();
        };
        mp4.appendBuffer(ab);
        mp4.flush();
    });
}

/**
 * @param {object} o
 * @param {string} o.stillsDir folder with way000.jpg, way001.jpg, ...
 * @param {string} o.outFile   .af path to write
 * @param {'h264'|'vp9'|'av1'} [o.codec]
 * @param {number} [o.gop]      keyframe interval in stills
 * @param {number} [o.crf]
 * @param {number} [o.width]    max width, height follows (even)
 * @param {string} [o.ssimRef]  folder of reference stills to report SSIM against
 * @returns {Promise<object>} the manifest, plus bytes and ssim
 */
export async function encodeAf({ stillsDir, outFile, codec = 'h264', gop = 5, crf, width = 1000, ssimRef }) {
    if (!CODEC_ARGS[codec]) throw new Error(`unknown codec ${codec}`);
    crf = crf ?? DEFAULT_CRF[codec];
    const tmpMp4 = path.join(os.tmpdir(), `af-${process.pid}-${Date.now()}-${codec}.mp4`);
    const ff = spawnSync(ffmpegPath(), [
        '-framerate', String(FPS), '-i', path.join(stillsDir, 'way%03d.jpg'),
        ...CODEC_ARGS[codec](crf),
        '-vf', `scale='min(${width},iw)':-2`,
        '-g', String(gop), '-keyint_min', String(gop), '-sc_threshold', '0',
        '-pix_fmt', 'yuv420p', '-map_metadata', '-1', '-an', '-movflags', '+faststart',
        '-y', tmpMp4,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    if (ff.status !== 0) throw new Error(`ffmpeg failed:\n${ff.stderr.toString().slice(-2000)}`);

    const quality = ssimRef ? ssim(tmpMp4, ssimRef) : null;
    const { track, description, chunks, frames, dataBytes } = await demux(fs.readFileSync(tmpMp4));
    fs.unlinkSync(tmpMp4);

    const manifest = {
        codec: track.codec,
        fps: FPS,
        totalFrames: frames.length,
        frames,
        width: track.video.width,
        height: track.video.height,
        gop,
        type: codec,
        description,
    };
    const footer = Buffer.alloc(4);
    footer.writeUInt32LE(dataBytes, 0);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, Buffer.concat([...chunks, Buffer.from(JSON.stringify(manifest)), footer]));
    return { ...manifest, dataBytes, bytes: fs.statSync(outFile).size, crf, ssim: quality };
}
