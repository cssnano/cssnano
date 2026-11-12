let counter = 0;
const table = new Map();
export function remember(key) {
  table.set(key, ++counter);
}
