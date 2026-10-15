import browserslist from 'browserslist';
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
export default function computeBrowsersToSupport(
  query,
  options,
  stats,
  from,
  file,
  env
) {
  if (query) return browserslist(query);
  return getBrowsersToSupport(
    /** @type {Parameters<typeof getBrowsersToSupport>[0]} */ (options),
    stats,
    from,
    file,
    env
  );
}
