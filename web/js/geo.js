// Geo helpers for the mobile walk. Positions are [lat, lng] like the desktop app.

const R = 6378137;
const rad = (d) => d * Math.PI / 180;
const deg = (r) => r * 180 / Math.PI;

export function distance(a, b) {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function bearing(a, b) {
  const dLng = rad(b[1] - a[1]);
  const y = Math.sin(dLng) * Math.cos(rad(b[0]));
  const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) -
    Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(dLng);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

// Spread `count` frame positions along a GeoJSON line ([lng, lat] points).
// Follows the desktop rules: a segment gets frames proportional to its length,
// unless wayPathSyncPoints pins the frame number reached at its end point.
export function framePositions(lineLngLat, count, syncPoints) {
  const pts = lineLngLat.map(([lng, lat]) => [lat, lng]);
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distance(pts[i], pts[i + 1]);
    segs.push({ a: pts[i], b: pts[i + 1], d, endFrame: syncPoints ? syncPoints[i + 1] : undefined });
    total += d;
  }

  const out = [];
  segs.forEach((s, j) => {
    let n;
    if (j === segs.length - 1) n = count - out.length;
    else if (typeof s.endFrame === 'number') n = s.endFrame - out.length;
    else n = Math.round(s.d * count / (total || 1));
    n = Math.max(0, n);
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0 : k / (n - 1);
      out.push([s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t]);
    }
  });
  while (out.length < count) out.push(pts[pts.length - 1]);
  return out.slice(0, count);
}

export function wayLength(lineLngLat) {
  let len = 0;
  for (let i = 1; i < lineLngLat.length; i++) {
    const [lng0, lat0] = lineLngLat[i - 1];
    const [lng1, lat1] = lineLngLat[i];
    len += distance([lat0, lng0], [lat1, lng1]);
  }
  return len;
}
