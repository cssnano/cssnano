export const siteUrl = 'https://cssnano.github.io/cssnano';
export const baseUrl = '/cssnano/';

/** @param {string} path */
export function url(path) {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}${normalized}`;
}

/** @param {string} path */
export function absoluteUrl(path) {
  const withoutBase = path.startsWith(baseUrl) ? path.slice(baseUrl.length - 1) : path;
  const normalized = withoutBase.startsWith('/') ? withoutBase : `/${withoutBase}`;
  return `${siteUrl}${normalized}`;
}
