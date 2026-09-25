// Renders the 2015 lodash templates (templates/**/*.html) unchanged, so the
// landing, pages and desktop street furniture keep their original markup.
// Supports lodash 3 syntax: <% code %>, <%= raw %>, <%- escaped %>.

const cache = new Map();
const files = new Map();

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (v) => (v == null ? '' : String(v).replace(/[&<>"']/g, (c) => ESC[c]));

// The only lodash helper the templates use.
const _ = { find: (list, pred) => (list || []).find(pred) };

export function compile(src) {
  let fn = cache.get(src);
  if (fn) return fn;
  const lit = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n');
  let code = "var __t,__p='';with(obj){__p+='";
  const re = /<%([=-]?)([\s\S]+?)%>/g;
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    code += lit(src.slice(last, m.index));
    if (m[1] === '=') code += "'+((__t=(" + m[2] + "))==null?'':__t)+'";
    else if (m[1] === '-') code += "'+__e(" + m[2] + ")+'";
    else code += "';\n" + m[2] + "\n__p+='";
    last = re.lastIndex;
  }
  code += lit(src.slice(last)) + "';}return __p;";
  // Function bodies are sloppy-mode even when created from a module, so `with` works.
  const body = new Function('obj', '__e', '_', code);
  fn = (data) => body(data || {}, escapeHtml, _);
  cache.set(src, fn);
  return fn;
}

// Fetches templates/<path>.html once and renders it with `data`.
export async function render(path, data) {
  if (!files.has(path)) {
    files.set(path, fetch(`templates/${path}.html`).then((r) => {
      if (!r.ok) throw new Error(`template ${path}: ${r.status}`);
      return r.text();
    }));
  }
  return compile(await files.get(path))(data);
}
