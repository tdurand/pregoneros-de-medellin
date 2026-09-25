# Pregoneros de Medellín

An interactive web documentary about the singing street vendors of Medellín: walk the streets by scrolling (or swiping on a phone), hear the vendors' calls around you, and find their stories.

Read the making of: [How we created an immersive street walk experience with a GoPro and JavaScript](https://medium.com/@tibbb/how-we-created-an-immersive-street-walk-experience-with-a-gopro-and-javascript-f442cf8aa2dd)

## Layout

| Path | What |
| --- | --- |
| `web/` | The site at `/`: one app for desktop and touch screens. Plain ES modules, no framework, no bundler. |
| `app/`, `templates/`, `style/` | The 2015 Backbone/RequireJS site. It's kept as it was at `/classic/`. The new app reuses its templates and stylesheet. |
| `content/` | `ways.json` (streets, GPS paths, sounds, vendor positions), UI strings (es/en/fr), subtitles. |
| `api/index.js` | HTML shell of the 2015 site, served at `/classic/`. |
| `tools/` | `build.mjs` assembles `public/`, and `serve.mjs` is a local server that follows `vercel.json`. |

Stills, sounds and videos aren't in the repo. They're served from `https://images.pregonerosdemedellin.com/` (`data/<street>/{lowres,highres}/wayNNN.jpg`, `data/sounds/*.mp3`, `video/*.mp4`). That host sends no CORS headers, so anything read through Web Audio or a canvas goes through the same-origin `/frames/` route in `vercel.json`.

## Develop

```
yarn install
yarn build      # public/: new app at /, 2015 site at /classic/
yarn serve      # http://localhost:8080/
```

Useful URL flags on the new app: `?debug` exposes `window.__walk`, `?touch` forces the touch layout and `?desktop` forces the desktop one.

## Deploy

Vercel deploys `master` automatically (Node 24, see `engines` in `package.json`).
