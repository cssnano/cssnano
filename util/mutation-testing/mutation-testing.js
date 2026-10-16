/**
 * Apply one curated source mutation without touching the source file.
 *
 * @param {string} source
 * @param {{ find: string, replace: string }} mutation
 * @returns {string}
 */
export function applyMutation(source, mutation) {
  const first = source.indexOf(mutation.find);
  if (first === -1) {
    throw new Error(`Mutation fragment was not found: ${mutation.find}`);
  }

  if (source.lastIndexOf(mutation.find) !== first) {
    throw new Error(
      `Mutation fragment matched more than once: ${mutation.find}`
    );
  }

  return `${source.slice(0, first)}${mutation.replace}${source.slice(
    first + mutation.find.length
  )}`;
}

/**
 * Map items with at most `limit` workers in flight; results keep input order.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} worker
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency(items, limit, worker) {
  const results = Array.from({ length: items.length });
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, lane)
  );
  return results;
}
