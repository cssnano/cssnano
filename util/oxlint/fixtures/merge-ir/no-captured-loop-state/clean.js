export function count(items) {
  const total = items.length;
  let seen = 0;
  seen = total;
  return items.map((item) => item + total + seen);
}
export function collect(items) {
  const out = [];
  for (const item of items) out.push(() => item);
  return out;
}
export function each(items) {
  let sum = 0;
  for (const item of items) {
    const next = item + 1;
    sum = next;
  }
  return sum;
}
export function reader(items) {
  const total = items.length;
  return () => total;
}
const LIMIT = 3;
function belowLimit(item) {
  return item < LIMIT;
}
export function inline(items, extra) {
  return items.filter((item) => belowLimit(item) && item !== extra);
}
export function passed(items, limit) {
  const within = (item, bound) => item < bound;
  return items.filter((item) => within(item, limit));
}
