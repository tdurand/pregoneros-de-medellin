// Pack a folder of stills (wayNNN.jpg) into a single ActiveFrame-compatible .af file.
//
// Same container as github.com/activetheory/activeframe (af.js): raw encoded
// samples, then a JSON manifest, then a little-endian uint32 with the manifest
// offset. Differences from upstream af.js:
//   - input is an image sequence, one still = one frame (no fps resampling)
//   - codec can be h264 (Safari/iOS hardware decode), vp9 or av1
//   - ffmpeg comes from $FFMPEG (or PATH) instead of ffmpeg-static
//   - manifest records `stills` so the player maps scroll -> still 1:1
//
// Set AF_REF=<dir of reference wayNNN.jpg> to print SSIM against it.
//
// usage: node tools/build_af.mjs <stills_dir> <out.af> [h264|vp9|av1] [gop=5] [crf=28] [maxWidth=1000]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFile, DataStream } from 'mp4box';

const [stillsDir, outFile, codec = 'h264', gop = '5', crf = '28', maxWidth = '1000'] = process.argv.slice(2);
if (!stillsDir || !outFile) {
    console.error('usage: node tools/build_af.mjs <stills_dir> <out.af> [h264|vp9|av1] [gop] [crf] [maxWidth]');
    process.exit(1);
}

const FPS = 30; // only used to space timestamps; playback is driven by scroll
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const tmpMp4 = path.join(os.tmpdir(), `af-${process.pid}.mp4`);

const codecArgs = {
    h264: ['-c:v', 'libx264', '-tag:v', 'avc1', '-profile:v', 'main', '-preset', 'slower',
        '-refs', '1', '-bf', '0', '-crf', crf],
    vp9: ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(Number(crf) + 8), '-row-mt', '1',
        '-deadline', 'good', '-cpu-used', '4', '-auto-alt-ref', '0', '-lag-in-frames', '0'],
    av1: ['-c:v', 'libaom-av1', '-b:v', '0', '-crf', String(Number(crf) + 8), '-cpu-used', '6',
        '-lag-in-frames', '0', '-row-mt', '1'],
}[codec];
if (!codecArgs) throw new Error(`unknown codec ${codec}`);

const ff = spawnSync(ffmpeg, [
    '-framerate', String(FPS), '-i', path.join(stillsDir, 'way%03d.jpg'),
    ...codecArgs,
    '-vf', `scale='min(${maxWidth},iw)':-2`,
    '-g', gop, '-keyint_min', gop, '-sc_threshold', '0',
    '-pix_fmt', 'yuv420p', '-map_metadata', '-1', '-an', '-movflags', '+faststart',
    '-y', tmpMp4,
], { stdio: ['ignore', 'ignore', 'pipe'] });
if (ff.status !== 0) {
    console.error(ff.stderr.toString());
    process.exit(1);
}

// Optional quality check against a reference sequence, compared at 1000px wide
let ssim = null;
if (process.env.AF_REF) {
    const q = spawnSync(ffmpeg, [
        '-i', tmpMp4, '-framerate', String(FPS), '-i', path.join(process.env.AF_REF, 'way%03d.jpg'),
        '-lavfi', '[1:v]scale=1000:-2:flags=bicubic[ref];[0:v][ref]scale2ref=flags=bicubic[a][b];[a][b]ssim', '-f', 'null', '-',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    const m = /All:([0-9.]+)/.exec(q.stderr.toString());
    ssim = m ? Number(m[1]) : null;
}

const buf = fs.readFileSync(tmpMp4);
fs.unlinkSync(tmpMp4);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
ab.fileStart = 0;

const mp4 = createFile();
mp4.onError = (e) => { console.error(e); process.exit(1); };
mp4.onReady = (info) => {
    const track = info.videoTracks[0];
    const entry = mp4.getTrackById(track.id).mdia.minf.stbl.stsd.entries[0];
    // H.264/H.265 need the avcC/hvcC record as the decoder description; VP9/AV1 do not
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
        if (frames.length < track.nb_samples) return;

        const manifest = {
            codec: track.codec,
            fps: FPS,
            totalFrames: frames.length,
            stills: frames.length,
            frames,
            width: track.video.width,
            height: track.video.height,
            gop: Number(gop),
            type: codec,
            description,
        };
        const footer = Buffer.alloc(4);
        footer.writeUInt32LE(offset, 0);
        fs.writeFileSync(outFile, Buffer.concat([...chunks, Buffer.from(JSON.stringify(manifest)), footer]));
        const keys = frames.filter((f) => f.ty === 'key').length;
        console.log(`${outFile}: ${frames.length} frames (${keys} key), ${track.codec} ${track.video.width}x${track.video.height}, ${(fs.statSync(outFile).size / 1024).toFixed(0)} KB${ssim ? `, SSIM ${ssim.toFixed(4)}` : ''}`);
    };
    mp4.setExtractionOptions(track.id, null, { nbSamples: track.nb_samples });
    mp4.start();
};
mp4.appendBuffer(ab);
mp4.flush();
