// Assembles public/ after r.js has built the 2015 app into public/classic/app:
//   public/          the new app (web/) with the shared content and assets
//   public/classic/  the 2015 Backbone site, kept as it was, served by api/index.js
import { cpSync, rmSync, existsSync } from 'node:fs';

const shared = ['content', 'fonts', 'images', 'seo', 'style'];

for (const dir of shared) cpSync(dir, `public/classic/${dir}`, { recursive: true });

cpSync('web', 'public', { recursive: true });
for (const dir of [...shared, 'templates']) cpSync(dir, `public/${dir}`, { recursive: true });

// The first mobile walk lived in m/; /m/ now redirects to / (vercel.json).
if (existsSync('public/m')) rmSync('public/m', { recursive: true });
console.log('public/ ready: new app at /, 2015 site at /classic/');
