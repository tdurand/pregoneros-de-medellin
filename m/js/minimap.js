// Street map drawn as plain SVG from ways.json: no Mapbox, no token, no tiles.

const NS = 'http://www.w3.org/2000/svg';

export class MiniMap {
  constructor(svg, ways) {
    this.svg = svg;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    ways.forEach((w) => w.wayPath.forEach(([lng, lat]) => {
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
    }));
    const k = Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
    const pad = 12;
    const w = (maxLng - minLng) * k;
    const h = maxLat - minLat;
    const scale = 1000 / Math.max(w, h);
    this.project = ([lat, lng]) => [
      pad + (lng - minLng) * k * scale,
      pad + (maxLat - lat) * scale,
    ];
    const vw = w * scale + pad * 2;
    const vh = h * scale + pad * 2;
    this.full = [0, 0, vw, vh];
    svg.setAttribute('viewBox', this.full.map((n) => n.toFixed(0)).join(' '));

    this.paths = {};
    const g = document.createElementNS(NS, 'g');
    ways.forEach((way) => {
      const p = document.createElementNS(NS, 'polyline');
      p.setAttribute('points', way.wayPath.map(([lng, lat]) => this.project([lat, lng]).map((n) => n.toFixed(1)).join(',')).join(' '));
      p.setAttribute('class', 'street');
      g.appendChild(p);
      this.paths[way.wayName] = p;
    });
    svg.appendChild(g);

    this.dot = document.createElementNS(NS, 'circle');
    this.dot.setAttribute('r', '14');
    this.dot.setAttribute('class', 'me');
    svg.appendChild(this.dot);
  }

  setWay(name, extra = []) {
    // Frame the neighbourhood around the current street: the three areas are
    // far apart, and the whole city would make each street a few pixels long.
    const p = this.paths[name];
    if (p && name !== this.framed) {
      this.framed = name;
      const pts = p.getAttribute('points').split(' ').map((xy) => xy.split(',').map(Number));
      const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length;
      const cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
      const r = 220;
      this.svg.setAttribute('viewBox', `${(cx - r).toFixed(0)} ${(cy - r).toFixed(0)} ${2 * r} ${2 * r}`);
    }
    Object.entries(this.paths).forEach(([n, p]) => {
      p.classList.toggle('current', n === name);
      p.classList.toggle('next', extra.includes(n));
    });
  }

  setPosition(latLng) {
    const [x, y] = this.project(latLng);
    this.dot.setAttribute('cx', x.toFixed(1));
    this.dot.setAttribute('cy', y.toFixed(1));
  }
}
