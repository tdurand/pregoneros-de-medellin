// Pack a folder of stills (wayNNN.jpg) into one .af file. Thin CLI over
// tools/media/af.mjs (run `npm install` in tools/media first).
// Set AF_REF=<dir of reference wayNNN.jpg> to print SSIM against it.
// CRF is passed straight to the encoder: x264 uses 0-51, libvpx-vp9 and libaom 0-63.
//
// usage: node tools/build_af.mjs <stills_dir> <out.af> [h264|vp9|av1] [gop=5] [crf] [maxWidth=1000]
import { encodeAf } from '../../../tools/media/af.mjs';

const [stillsDir, outFile, codec = 'h264', gop = '5', crf, width = '1000'] = process.argv.slice(2);
if (!stillsDir || !outFile) {
    console.error('usage: node tools/build_af.mjs <stills_dir> <out.af> [h264|vp9|av1] [gop] [crf] [maxWidth]');
    process.exit(1);
}
const m = await encodeAf({
    stillsDir, outFile, codec, gop: Number(gop), crf: crf === undefined ? undefined : Number(crf),
    width: Number(width), ssimRef: process.env.AF_REF,
});
const keys = m.frames.filter((f) => f.ty === 'key').length;
console.log(`${outFile}: ${m.totalFrames} frames (${keys} key), ${m.codec} ${m.width}x${m.height}, ` +
    `${(m.bytes / 1024).toFixed(0)} KB${m.ssim ? `, SSIM ${m.ssim.toFixed(4)}` : ''}`);
