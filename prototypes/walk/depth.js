// Depth view shown only while the walker is stopped.
//
// The still is drawn in WebGL as a mesh pushed out along its view rays by a
// depth map (Depth Anything V2 in a Web Worker). With depth at 0 and the camera
// at the origin, the mesh renders exactly like the flat <img> underneath, so the
// view can fade in over it and then "inflate" into 3D without a visible jump.
import * as THREE from 'three';

const MODEL = new URLSearchParams(location.search).get('model') || 'onnx-community/depth-anything-v2-small';
const NEAR_M = 1.2, FAR_M = 60;

// --- depth model in a worker, so inference never blocks the page -----------
const WORKER_SRC = `
import { pipeline, env, RawImage } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';
env.allowLocalModels = false;
let pipe;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      let backend;
      try {
        if (!self.navigator.gpu) throw new Error('no webgpu');
        pipe = await pipeline('depth-estimation', data.model, { device: 'webgpu', dtype: 'fp16' }); backend = 'WebGPU';
      } catch {
        pipe = await pipeline('depth-estimation', data.model, { device: 'wasm', dtype: 'q8' }); backend = 'WASM';
      }
      self.postMessage({ type: 'ready', backend });
      return;
    }
    const out = await pipe(await RawImage.fromURL(data.url));
    const { width, height, channels } = out.depth;
    const px = new Uint8Array(width * height);
    // bottom row first, to match WebGL texture orientation
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      px[(height - 1 - y) * width + x] = out.depth.data[(y * width + x) * channels];
    }
    self.postMessage({ type: 'depth', id: data.id, width, height, px }, [px.buffer]);
  } catch (e) { self.postMessage({ type: 'error', id: data.id, message: String(e) }); }
};`;

let worker = null, ready = null, backend = 'none';
const jobs = new Map(); let jobId = 0;

export function initDepthModel() {
  if (ready) return ready;
  ready = new Promise((ok, err) => {
    worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })), { type: 'module' });
    worker.onerror = (e) => { backend = 'unavailable, using a street-shape guess'; err(new Error(e.message || 'depth worker failed')); };
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') { backend = data.backend; ok(backend); return; }
      const job = jobs.get(data.id);
      if (!job) { if (data.type === 'error') err(new Error(data.message)); return; }
      jobs.delete(data.id);
      data.type === 'depth' ? job.ok(data) : job.err(new Error(data.message));
    };
    worker.postMessage({ type: 'init', model: MODEL });
  });
  return ready;
}
export const depthBackend = () => backend;

const depthCache = new Map(); // url -> Promise<DataTexture>
export function depthFor(url) {
  if (!depthCache.has(url)) {
    depthCache.set(url, initDepthModel().then(() => new Promise((ok, err) => {
      const id = ++jobId; jobs.set(id, { ok, err });
      worker.postMessage({ id, url: new URL(url, location.href).href });
    })).then(({ width, height, px }) => {
      const t = new THREE.DataTexture(px, width, height, THREE.RedFormat, THREE.UnsignedByteType);
      t.minFilter = t.magFilter = THREE.LinearFilter; t.unpackAlignment = 1; t.needsUpdate = true;
      return t;
    }).catch((e) => { depthCache.delete(url); throw e; }));
  }
  return depthCache.get(url);
}

// Street-shaped guess used when the model can't load: ground nearer towards the
// bottom, facades nearer towards the sides.
function heuristicDepth() {
  const w = 64, h = 36, px = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = y / h, u = x / w; // v = 0 is the bottom row
    const ground = v < 0.5 ? (0.5 - v) * 2 : 0;
    const walls = Math.pow(Math.abs(u - 0.5) * 2, 2) * 0.6;
    px[y * w + x] = Math.min(1, Math.max(ground * 0.9, walls, 0.08)) * 255;
  }
  const t = new THREE.DataTexture(px, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.unpackAlignment = 1; t.needsUpdate = true;
  return t;
}
export const fallbackDepth = heuristicDepth();

// Background layer: a min-filter pushes near things (people, poles) back to the
// depth of what surrounds them, so the gaps opened behind them have somewhere to go.
function backgroundDepth(tex) {
  const { width: w, height: h, data } = tex.image;
  const r = Math.max(4, Math.round(w / 40));
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let m = 255; for (let d = -r; d <= r; d++) { const xx = Math.min(w - 1, Math.max(0, x + d)); m = Math.min(m, data[y * w + xx]); }
    tmp[y * w + x] = m;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let m = 255; for (let d = -r; d <= r; d++) { const yy = Math.min(h - 1, Math.max(0, y + d)); m = Math.min(m, tmp[yy * w + x]); }
    out[y * w + x] = m;
  }
  const t = new THREE.DataTexture(out, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.unpackAlignment = 1; t.needsUpdate = true;
  return t;
}
const bgCache = new WeakMap();
const bgFor = (tex) => { if (!bgCache.has(tex)) bgCache.set(tex, backgroundDepth(tex)); return bgCache.get(tex); };

// Blurred copy of the photo, used to fill what was hidden behind people.
function blurred(img) {
  const c = document.createElement('canvas'); c.width = 96; c.height = Math.round(96 * img.naturalHeight / img.naturalWidth);
  const ctx = c.getContext('2d'); ctx.filter = 'blur(2px)'; ctx.drawImage(img, 0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// --- renderer ----------------------------------------------------------------
const LENS = `
uniform float tanHalfW; uniform float aspect;
vec3 uvToDir(vec2 uv){ vec2 p = (uv - 0.5) * 2.0; return normalize(vec3(p.x * tanHalfW, p.y * tanHalfW / aspect, -1.0)); }
vec2 dirToUv(vec3 d){ vec2 p = d.xy / max(-d.z, 1e-3); return vec2(p.x / tanHalfW, p.y * aspect / tanHalfW) * 0.5 + 0.5; }`;

// style: 'clean'  foreground torn at depth edges, background layer fills the gaps
//        'stretch' one continuous surface (people get smeared at their edges)
//        'look'   no 3D at all: the photo on a sphere, drag or tilt to look around
export function createDepthView(canvas, { hfov = 100, tear = 0.05 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 500);
  const scene = new THREE.Scene();
  const tanHalfW = Math.tan(THREE.MathUtils.degToRad(hfov) / 2);

  const geo = new THREE.PlaneGeometry(1, 1, 160, 90);
  { const uv = geo.attributes.uv, pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setXYZ(i, uv.getX(i), uv.getY(i), 0); }
  const uniforms = {
    map: { value: null }, depth: { value: fallbackDepth }, amount: { value: 0 },
    tanHalfW: { value: tanHalfW }, aspect: { value: 16 / 9 },
  };
  const VERT = LENS + `
      uniform sampler2D depth; uniform float amount, tear; varying vec2 vUv; varying float vEdge;
      float dispAt(vec2 uv){ return texture2D(depth, uv).r; }
      void main(){
        vUv = position.xy;
        float disp = dispAt(vUv);                               // 1 = near
        // biggest depth jump to the neighbouring grid points: a silhouette edge
        vec2 g = vec2(1.0 / 160.0, 1.0 / 90.0);
        float e = max(max(abs(dispAt(vUv + vec2(g.x, 0.)) - disp), abs(dispAt(vUv - vec2(g.x, 0.)) - disp)),
                      max(abs(dispAt(vUv + vec2(0., g.y)) - disp), abs(dispAt(vUv - vec2(0., g.y)) - disp)));
        vEdge = tear > 0.0 ? step(tear, e) : 0.0;
        float dist = 1.0 / mix(${(1 / FAR_M).toFixed(5)}, ${(1 / NEAR_M).toFixed(5)}, disp);
        vec3 p = uvToDir(vUv) * mix(12.0, dist, amount);        // amount 0 = flat, same as the <img>
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`;
  // The back layer's geometry uses the background depth; fgDepth is the real depth,
  // so where the two differ something nearer stood there.
  const FRAG = `uniform sampler2D map, fill, depth, fgDepth; uniform float isBack; varying vec2 vUv; varying float vEdge;
      void main(){
        if (isBack < 0.5 && vEdge > 0.01) discard;             // tear the foreground at silhouettes
        vec2 e = smoothstep(0.0, 0.02, vUv) * smoothstep(0.0, 0.02, 1.0 - vUv);
        vec3 c = texture2D(map, vUv).rgb;
        if (isBack > 0.5) {
          // where something nearer stood, show a blur of the surroundings, not the person again
          float fg = smoothstep(0.03, 0.10, texture2D(fgDepth, vUv).r - texture2D(depth, vUv).r);
          c = mix(c, texture2D(fill, vUv).rgb, fg);
        }
        gl_FragColor = vec4(c, isBack > 0.5 ? 1.0 : e.x * e.y);
        #include <colorspace_fragment>
      }`;
  const makeLayer = (isBack) => {
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: {
        ...uniforms, depth: isBack ? { value: fallbackDepth } : uniforms.depth,
        fgDepth: { value: fallbackDepth }, fill: { value: null },
        tear: { value: isBack ? 0 : tear }, isBack: { value: isBack ? 1 : 0 },
      },
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
      transparent: !isBack,
    }));
    m.frustumCulled = false; return m;
  };
  const mesh = makeLayer(false);
  const back = makeLayer(true);    // sits behind the torn foreground
  back.renderOrder = 0; mesh.renderOrder = 1;
  // Beyond the frame: the photo's own edge colours, blurred, so turning your head
  // doesn't show black. (Where real 360° outpainting would go.)
  const surround = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), new THREE.ShaderMaterial({
    uniforms: { map: { value: null }, tanHalfW: uniforms.tanHalfW, aspect: uniforms.aspect },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: LENS + `uniform sampler2D map; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); vec3 f = d; if (f.z > -0.1) f = normalize(vec3(f.xy, -0.1));
        vec3 c = texture2D(map, clamp(dirToUv(f), 0.02, 0.98)).rgb;
        gl_FragColor = vec4(c * (1.0 - 0.5 * smoothstep(-0.2, 0.9, d.z)), 1.);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false,
  }));
  surround.renderOrder = -1;
  scene.add(surround, back, mesh);
  let style = 'clean';
  function applyStyle() {
    mesh.material.uniforms.tear.value = style === 'clean' ? tear : 0;
    back.visible = style === 'clean';
  }

  let running = false, shownAt = 0, raf = 0;
  const look = { yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };
  const head = new THREE.Vector2(), headT = new THREE.Vector2();
  let gyroBase = null;

  function fit() {
    const w = innerWidth, h = innerHeight, sa = w / h, pa = uniforms.aspect.value;
    renderer.setSize(w, h, false); camera.aspect = sa;
    // "cover" like the <img>: fill the screen with the photo, cropping the long side
    const halfH = sa >= pa ? tanHalfW / sa : tanHalfW / pa;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfH));
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', fit);

  canvas.addEventListener('pointermove', (e) => { headT.set((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2); });
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw: look.yawT, pitch: look.pitchT }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    look.yawT = drag.yaw + (e.clientX - drag.x) * 0.004;
    look.pitchT = THREE.MathUtils.clamp(drag.pitch + (e.clientY - drag.y) * 0.003, -1, 1);
  });
  function onOrient(e) {
    if (e.alpha == null || !running) return;
    const a = THREE.MathUtils.degToRad(e.alpha), b = THREE.MathUtils.degToRad(e.beta);
    if (!gyroBase) gyroBase = { a, b };
    look.yawT = a - gyroBase.a; look.pitchT = THREE.MathUtils.clamp(b - gyroBase.b, -1, 1);
  }

  function frame() {
    if (!running) return;
    const t = (performance.now() - shownAt) / 1000;
    const ease = 1 - Math.exp(-t * 1.6);
    const amt = style === 'look' ? 0 : ease;
    uniforms.amount.value = amt; back.material.uniforms.amount.value = amt;
    const drift = style === 'look' ? 0 : ease;
    look.yaw += (look.yawT - look.yaw) * 0.12; look.pitch += (look.pitchT - look.pitch) * 0.12;
    head.lerp(headT, 0.06);
    // a slow, small drift so the depth reads without any input
    camera.position.set(
      (0.07 * Math.sin(t * 0.55) + head.x * 0.08) * drift,
      (0.02 * Math.sin(t * 0.8) - head.y * 0.04) * drift,
      -0.15 * drift);
    camera.rotation.set(-look.pitch, -look.yaw, 0, 'YXZ');
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  return {
    // img: a loaded HTMLImageElement (same-origin), depthTex: DataTexture
    show(img, depthTex) {
      const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
      uniforms.map.value?.dispose();
      uniforms.map.value = tex; surround.material.uniforms.map.value = tex;
      const d = depthTex || fallbackDepth;
      uniforms.depth.value = d;
      const bu = back.material.uniforms;
      bu.fill.value?.dispose(); bu.fill.value = blurred(img);
      bu.fgDepth.value = d; bu.depth.value = bgFor(d);
      applyStyle();
      uniforms.aspect.value = img.naturalWidth / img.naturalHeight;
      look.yaw = look.yawT = look.pitch = look.pitchT = 0; gyroBase = null;
      fit();
      shownAt = performance.now();
      if (!running) { running = true; raf = requestAnimationFrame(frame); }
    },
    setStyle(s) { style = s; shownAt = performance.now(); applyStyle(); },
    get style() { return style; },
    hide() { running = false; cancelAnimationFrame(raf); },
    get running() { return running; },
    async enableGyro() {
      if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
        if (await DeviceOrientationEvent.requestPermission() !== 'granted') return false;
      }
      addEventListener('deviceorientation', onOrient); return true;
    },
    disableGyro() { removeEventListener('deviceorientation', onOrient); look.yawT = look.pitchT = 0; gyroBase = null; },
  };
}
