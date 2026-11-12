const cache = new Map();
export function memo(key) {
  cache.set(key, key);
  return cache.get(key);
}
