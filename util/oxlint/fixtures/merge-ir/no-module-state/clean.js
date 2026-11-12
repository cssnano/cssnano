const table = new Map([['a', 1]]);
table.set('b', 2);
const names = ['x'];
export function lookup(key) {
  return table.get(key) ?? names.length;
}
export function local() {
  const scratch = new Map();
  scratch.set('x', 1);
  let count = 0;
  count += scratch.size;
  return count;
}
