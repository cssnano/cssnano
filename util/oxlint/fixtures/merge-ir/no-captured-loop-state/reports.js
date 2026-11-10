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
