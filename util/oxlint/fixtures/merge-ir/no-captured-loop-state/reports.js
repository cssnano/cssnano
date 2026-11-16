export function outer(items) {
  let total = 0;
  items.forEach((item) => {
    total += item;
  });
  return total;
}
export function scan(items) {
  let index = 0;
  for (const item of items) {
    index = index + item;
  }
  return () => index;
}
export function declared(items) {
  const limit = items.length;
  function within(item) {
    return item < limit;
  }
  return items.filter(within);
}
export function bound(items, extra) {
  const add = (item) => item + extra;
  return items.map((item) => add(item));
}
export function nested(items) {
  const limit = items.length;
  const check = (item) => [item].some((other) => other < limit);
  return items.filter(check);
}
