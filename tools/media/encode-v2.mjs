#!/usr/bin/env node
// Build the v2 media for the street walk: one video frame file per street and
// codec, plus an index the player reads first.
//
//   data/<way>/v2/h264-1000.af   H.264, decoded in hardware on iOS, macOS, Android, Windows
//   data/<way>/v2/vp9-1000.af    VP9, for browsers without H.264 in WebCodecs (e.g. Chromium on Linux)
//   data/<way>/v2/index.json     frame offsets for each file, so playback can start while it downloads
//
// Source stills are the existing 1920px ones (data/<way>/highres/wayNNN.jpg).
// They are read from --src when present there, otherwise downloaded once
// into --cache from the media host. Re-run with the original footage later
// by pointing --src at freshly extracted stills (same names).
//
// usage:
//   FFMPEG=/path/to/ffmpeg node encode-v2.mjs --out ../../dist-media [--ways a,b | --all]
//     [--src <dir with <way>/highres/>] [--cache .cache] [--codecs h264,vp9]
//     [--width 1000] [--gop 5] [--crf-h264 29] [--crf-vp9 50] [--ssim] [--force]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeAf, DEFAULT_CRF } from './af.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WAYS_JSON = path.join(HERE, '../../content/ways.json');
const MEDIA_HOST = 'https://images.pregonerosdemedellin.com';

function parseArgs(argv) {
    const a = { codecs: 'h264,vp9', width: 1000, gop: 5, cache: path.join(HERE, '.cache') };
    for (let i = 0; i < argv.length; i++) {
        const k = argv[i].replace(/^--/, '');
        if (['all', 'ssim', 'force'].includes(k)) a[k] = true;
        else a[k] = argv[++i];
    }
    return a;
}

async function download(url, file) {
    for (let attempt = 1; ; attempt++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`${res.status} ${url}`);
            fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
            return;
        } catch (e) {
            if (attempt >= 4) throw e;
            await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
    }
}

// Returns a folder holding way000.jpg ... for this way, downloading what is missing.
async function stillsFor(way, n, args) {
    if (args.src) {
        const dir = path.join(args.src, way, 'highres');
        if (fs.existsSync(path.join(dir, 'way000.jpg'))) return dir;
    }
    const dir = path.join(args.cache, way, 'highres');
    fs.mkdirSync(dir, { recursive: true });
    const todo = [];
    for (let i = 0; i < n; i++) {
        const name = `way${String(i).padStart(3, '0')}.jpg`;
        if (!fs.existsSync(path.join(dir, name))) todo.push(name);
    }
    let next = 0;
    await Promise.all(Array.from({ length: 8 }, async () => {
        while (next < todo.length) {
            const name = todo[next++];
            await download(`${MEDIA_HOST}/data/${way}/highres/${name}`, path.join(dir, name));
        }
    }));
    if (todo.length) console.log(`  downloaded ${todo.length} stills`);
    return dir;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.out) {
        console.error('usage: node encode-v2.mjs --out <dir> [--ways a,b | --all] [--src dir] [--codecs h264,vp9] [--ssim]');
        process.exit(1);
    }
    const ways = JSON.parse(fs.readFileSync(WAYS_JSON, 'utf8'));
    const wanted = args.all ? ways : ways.filter((w) => (args.ways || 'plazabotero-start-carabobo').split(',').includes(w.wayName));
    if (!wanted.length) throw new Error('no matching ways');
    const codecs = args.codecs.split(',');
    const width = Number(args.width);
    const gop = Number(args.gop);

    for (const way of wanted) {
        const outDir = path.join(args.out, 'data', way.wayName, 'v2');
        const indexFile = path.join(outDir, 'index.json');
        if (!args.force && fs.existsSync(indexFile)) {
            console.log(`${way.wayName}: up to date, skipping (--force to rebuild)`);
            continue;
        }
        console.log(`${way.wayName}: ${way.nbStills} stills`);
        const stills = await stillsFor(way.wayName, way.nbStills, args);
        const sources = [];
        for (const codec of codecs) {
            const file = `${codec}-${width}.af`;
            const crf = Number(args[`crf-${codec}`] ?? DEFAULT_CRF[codec]);
            const m = await encodeAf({
                stillsDir: stills, outFile: path.join(outDir, file), codec, gop, crf, width,
                ssimRef: args.ssim ? stills : undefined,
            });
            if (m.totalFrames !== way.nbStills) {
                throw new Error(`${way.wayName}: encoded ${m.totalFrames} frames, ways.json says ${way.nbStills}`);
            }
            console.log(`  ${file}: ${(m.bytes / 1048576).toFixed(2)} MB, ${m.codec} ${m.width}x${m.height}` +
                (m.ssim ? `, SSIM ${m.ssim.toFixed(3)}` : ''));
            sources.push({
                file,
                type: codec,
                codec: m.codec,
                width: m.width,
                height: m.height,
                gop,
                crf,
                bytes: m.bytes,
                ssim: m.ssim,
                description: m.description,
                // [byte offset, byte length, 1 if keyframe] per still, in file order
                frames: m.frames.map((f) => [f.o, f.l, f.ty === 'key' ? 1 : 0]),
            });
        }
        fs.writeFileSync(indexFile, JSON.stringify({
            version: 2,
            way: way.wayName,
            stills: way.nbStills,
            encodedAt: new Date().toISOString(),
            sources,
        }));
    }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
