/**
 * @template {{ href: string, match?: string[] }} T
 * @param {string} pathname page path, including the site base
 * @param {T[]} links links match by their `match` prefixes, or by `href` when `match` is absent
 * @returns {T | undefined} the link whose longest matching prefix is longest
 */
export function currentLink(pathname, links) {
  let current;
  let currentLength = 0;
  for (const link of links) {
    for (const prefix of link.match ?? [link.href]) {
      if (prefix.length > currentLength && pathname.startsWith(prefix)) {
        current = link;
        currentLength = prefix.length;
      }
    }
  }
  return current;
}

/**
 * @param {string} shortName optimisation display name, such as `mergeLonghand`
 * @returns {string} the slug of its docs page, such as `mergelonghand`
 */
export function optimisationSlug(shortName) {
  return shortName.toLowerCase();
}
