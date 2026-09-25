// Walk one street in the mobile app (m/, draft PR #3) with the JPEG FrameLoader
// and with VideoFrameLoader, in headless Chromium with a phone viewport and
// throttled network/CPU. Prints one JSON line per run and a median table.
//
// usage: node tools/bench-mobile.mjs <base url of a folder with m/, content/ and assets/data/<way>/{lowres,highres,v2}> [runs=3]
import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://localhost:8766';
const runs = Number(process.argv[3] || 3);
const executablePath = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const variants = [
    { name: 'JPEG FrameLoader (PR #3)', q: '' },
    { name: 'VideoFrameLoader (v2, VP9 here)', q: '&video' },
];
const profiles = [
    { name: 'fast 4G, 4x CPU', down: 9e6, rtt: 60, cpu: 4 },
    { name: 'cable, 1x CPU', down: 50e6, rtt: 20, cpu: 1 },
];

// Runs in the page: wait until walkable, then walk forward the whole street at
// 0.75 still per frame (a brisk swipe pace), back half of it, then 10 jumps.
async function walk() {
    const t0 = performance.timeOrigin;
    const w = window.__walk;
    while (!w.loader || !w.loader.ready) await new Promise((r) => setTimeout(r, 20));
    const readyMs = performance.now();
    while (w.shown < 0 || !w.loader.nearest(0)) await new Promise((r) => requestAnimationFrame(r));
    const firstFrameMs = performance.now();
    const n = w.way.nbStills;
    const path = [];
    for (let p = 0; p < n - 1; p += 0.75) path.push(p);
    for (let p = n - 1; p > n / 2; p -= 0.75) path.push(p);
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let j = 0; j < 10; j++) { const p = Math.floor(rnd() * n); for (let h = 0; h < 15; h++) path.push(p); }
    const behind = [];
    let prev = performance.now();
    const gaps = [];
    for (const p of path) {
        w.pos = p; w.lastMove = performance.now();
        await new Promise((r) => requestAnimationFrame(r));
        const now = performance.now(); gaps.push(now - prev); prev = now;
        const i = Math.round(w.pos);
        const lo = w.loader.nearest(i);
        behind.push(lo ? Math.abs(lo.index - i) : n);
    }
    const walkEndMs = performance.now();
    // let loading finish to count total bytes
    const res = () => performance.getEntriesByType('resource').filter((e) => /\/assets\//.test(e.name));
    const pct = (a, q) => { a = a.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; };
    return {
        readyMs: Math.round(readyMs), firstFrameMs: Math.round(firstFrameMs),
        requestsDuringWalk: res().length,
        mbDuringWalk: +(res().reduce((s, e) => s + (e.encodedBodySize || 0), 0) / 1048576).toFixed(2),
        stalePct: +(100 * behind.filter((b) => b > 3).length / behind.length).toFixed(1),
        behindP50: pct(behind, 0.5), behindP95: pct(behind, 0.95),
        frameGapP95: +pct(gaps, 0.95).toFixed(1),
        walkSeconds: +((walkEndMs - firstFrameMs) / 1000).toFixed(1),
        source: w.loader.source ? w.loader.source.file : (w.loader.fallback ? 'fell back to JPEG' : 'jpeg'),
    };
}

const browser = await chromium.launch({ executablePath });
const table = [];
for (const profile of profiles) {
    for (const v of variants) {
        const out = [];
        for (let r = 0; r < runs; r++) {
            const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
            const page = await ctx.newPage();
            page.on('pageerror', (e) => console.error('pageerror', e.message));
            const cdp = await ctx.newCDPSession(page);
            await cdp.send('Network.enable');
            // Count bytes on the wire for the street's media (resource timing misses streamed/cancelled bodies)
            const urls = new Map();
            let mediaBytes = 0, mediaRequests = 0;
            cdp.on('Network.requestWillBeSent', (e) => { if (e.request.url.includes('/assets/')) { urls.set(e.requestId, e.request.url); mediaRequests++; } });
            cdp.on('Network.dataReceived', (e) => { if (urls.has(e.requestId)) mediaBytes += e.encodedDataLength || e.dataLength; });
            await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
            await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: profile.rtt, downloadThroughput: profile.down / 8, uploadThroughput: 2e6 / 8 });
            await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
            await page.goto(`${base}/m/index.html?assets=${base}/assets&debug${v.q}#plazabotero-start-carabobo/es`);
            await page.evaluate(() => performance.setResourceTimingBufferSize(5000));
            // the app starts the walk from a "Start" tap
            const start = page.locator('#start-btn');
            if (await start.count()) await start.click().catch(() => {});
            const m = await page.evaluate(walk);
            m.requestsDuringWalk = mediaRequests;
            m.mbDuringWalk = +(mediaBytes / 1048576).toFixed(2);
            console.log(JSON.stringify({ profile: profile.name, variant: v.name, run: r, ...m }));
            out.push(m);
            await ctx.close();
        }
        table.push({ profile: profile.name, variant: v.name, out });
    }
}
await browser.close();
const med = (a) => { a = a.slice().sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
const cols = ['readyMs', 'firstFrameMs', 'requestsDuringWalk', 'mbDuringWalk', 'stalePct', 'behindP50', 'behindP95', 'frameGapP95'];
console.log('\n| profile | variant | ' + cols.join(' | ') + ' |\n|' + ' --- |'.repeat(cols.length + 2));
for (const t of table) console.log(`| ${t.profile} | ${t.variant} | ${cols.map((c) => med(t.out.map((o) => o[c]))).join(' | ')} |`);
