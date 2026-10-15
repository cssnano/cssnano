import getBrowsersToSupport from '#getBrowsersList';
/**
 * A query selects browsers directly; without one, the shared targets apply.
 *
 * @param {string | null} [query]
 * @param {Parameters<typeof getBrowsersToSupport>[0]} [options]
 * @param {Parameters<typeof getBrowsersToSupport>[1]} [stats]
 * @param {Parameters<typeof getBrowsersToSupport>[2]} [from]
 * @param {Parameters<typeof getBrowsersToSupport>[3]} [file]
 * @param {Parameters<typeof getBrowsersToSupport>[4]} [env]
 * @returns {string[]}
 */
export default function computeBrowsersToSupport(query?: string | null, options?: Parameters<typeof getBrowsersToSupport>[0], stats?: Parameters<typeof getBrowsersToSupport>[1], from?: Parameters<typeof getBrowsersToSupport>[2], file?: Parameters<typeof getBrowsersToSupport>[3], env?: Parameters<typeof getBrowsersToSupport>[4]): string[];
//# sourceMappingURL=computeBrowsersToSupport.d.ts.map