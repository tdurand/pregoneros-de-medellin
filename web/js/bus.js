// Tiny event bus between the walk engine and the screens around it
// (phone controls, desktop street furniture, landing, pages).

const target = new EventTarget();

export function emit(type, detail) {
  target.dispatchEvent(new CustomEvent(type, { detail }));
}

export function on(type, fn) {
  const h = (e) => fn(e.detail);
  target.addEventListener(type, h);
  return () => target.removeEventListener(type, h);
}
