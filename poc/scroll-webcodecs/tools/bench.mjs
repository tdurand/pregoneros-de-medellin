// Run index.html in headless Chromium for each variant and network/CPU profile,
// print one JSON line per run and a markdown table at the end.
//
// usage: CHROMIUM=/path/to/chrome node tools/bench.mjs <base url> [runs=3]
//   <base url> must serve this folder at /poc/ and the stills at /street/
//   (lowres/, highres/, af/*.af), e.g. `python3 -m http.server` from a folder
//   with two symlinks.
import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://localhost:8765';
const runs = Number(process.argv[3] || 3);
const executablePath = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const variants = [
    { name: 'today: JPEG 500px, 1920px on idle', q: `mode=legacy&stills=${base}/street&n=378` },
    { name: 'WebCodecs VP9 1000px GOP 5', q: `mode=webcodecs&af=${base}/street/af/vp9-1000-g5.af` },
    { name: 'WebCodecs VP9 1000px GOP 15', q: `mode=webcodecs&af=${base}/street/af/vp9-1000-g15.af` },
    { name: 'WebCodecs VP9 1000px all-intra', q: `mode=webcodecs&af=${base}/street/af/vp9-1000-g1.af` },
].filter((v) => !process.env.BENCH_ONLY || v.name.includes(process.env.BENCH_ONLY));
const profiles = [
    { name: 'fast 4G, 4x CPU', down: 9e6, rtt: 60, cpu: 4 },
    { name: 'cable, 1x CPU', down: 50e6, rtt: 20, cpu: 1 },
];

const browser = await chromium.launch({ executablePath });
const rows = [];
for (const profile of profiles) {
    for (const v of variants) {
        const results = [];
        for (let r = 0; r < runs; r++) {
            const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
            const page = await ctx.newPage();
            const cdp = await ctx.newCDPSession(page);
            await cdp.send('Network.enable');
            await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
            await cdp.send('Network.emulateNetworkConditions', {
                offline: false, latency: profile.rtt, downloadThroughput: profile.down / 8, uploadThroughput: 2e6 / 8,
            });
            await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
            await page.goto(`${base}/poc/index.html?${v.q}&bench=1`);
            await page.waitForFunction(() => window.__bench && (window.__bench.finished || window.__bench.error), null, { timeout: 300000, polling: 500 });
            const b = await page.evaluate(() => window.__bench.summary || { error: window.__bench.error });
            // Legacy keeps loading after "ready"; wait for completion to report total time and bytes
            if (!b.error && b.fullyLoadedMs === null) {
                await page.waitForFunction(() => window.__bench.fullyLoadedMs, null, { timeout: 300000, polling: 500 });
                Object.assign(b, await page.evaluate(() => {
                    const res = performance.getEntriesByType('resource');
                    return {
                        fullyLoadedMs: Math.round(window.__bench.fullyLoadedMs),
                        requestsTotal: res.length,
                        megabytesTotal: +(res.reduce((s, e) => s + (e.encodedBodySize || 0), 0) / 1048576).toFixed(2),
                    };
                }));
            }
            console.log(JSON.stringify({ profile: profile.name, variant: v.name, run: r, ...b }));
            results.push(b);
            await ctx.close();
        }
        rows.push({ profile: profile.name, variant: v.name, results });
    }
}
await browser.close();

const med = (a) => { a = a.filter((x) => x !== null && x !== undefined).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
const cols = ['readyMs', 'fullyLoadedMs', 'megabytesTotal', 'staleTickPct', 'stillsBehindP50', 'stillsBehindP95', 'frameGapP95', 'framesOver50ms', 'longTaskMs', 'decodeLatencyP50', 'decodeLatencyP95'];
console.log('\n| profile | variant | ' + cols.join(' | ') + ' |');
console.log('|' + ' --- |'.repeat(cols.length + 2));
for (const row of rows) {
    const vals = cols.map((c) => med(row.results.map((r) => (c === 'megabytesTotal' ? (r.megabytesTotal ?? r.megabytes) : r[c]))));
    console.log(`| ${row.profile} | ${row.variant} | ${vals.map((x) => (x === null ? '–' : x)).join(' | ')} |`);
}
