// Local server that follows vercel.json: `npm run build && npm run serve`.
//   /frames/*  -> the media host (same-origin, like the Vercel rewrite)
//   /classic/  -> api/index.js (the 2015 site's HTML shell)
//   /m/        -> redirect to /
//   anything else -> public/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = Number(process.env.PORT) || 8080;
const classic = createRequire(import.meta.url)('../api/index.js');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.vtt': 'text/vtt',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject',
  '.webp': 'image/webp', '.avif': 'image/avif', '.pdf': 'application/pdf', '.zip': 'application/zip',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);
  try {
    if (p.startsWith('/frames/')) {
      const r = await fetch('https://images.pregonerosdemedellin.com/data/' + p.slice(8), {
        headers: req.headers.range ? { range: req.headers.range } : {},
      });
      const headers = { 'content-type': r.headers.get('content-type') || 'application/octet-stream', 'accept-ranges': 'bytes' };
      if (r.headers.get('content-range')) headers['content-range'] = r.headers.get('content-range');
      res.writeHead(r.status, headers);
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    if (p === '/classic') { res.writeHead(308, { location: '/classic/' }); return res.end(); }
    if (p === '/classic/') {
      res.send = (body) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(body); };
      return classic(req, res);
    }
    if (p === '/m' || p.startsWith('/m/')) { res.writeHead(308, { location: '/' }); return res.end(); }
    let file = path.join(ROOT, 'public', p);
    if (!file.startsWith(path.join(ROOT, 'public'))) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(502);
    res.end(String(e));
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}/  (2015 site: /classic/)`));
