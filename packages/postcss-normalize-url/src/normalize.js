/* Derived from normalize-url https://github.com/sindresorhus/normalize-url/main/index.js by Sindre Sorhus.
   Data URLs are intentionally out of scope: the plugin passes them through unchanged. */

const supportedProtocols = new Set(['https:', 'http:', 'file:']);
// WHATWG pathname never embeds the protocol, so consecutive slashes are redundant.
const duplicateSlashRegex = /\/{2,}/gv;
// RFC 3986 §2.3: Unreserved characters (ALPHA / DIGIT / "-" / "_" / "~"),
// excluding %2E and %2F which affect path structure and dot-segment resolution.
export const unreservedRegex =
  /%(?:2[dD]|3[0-9]|[46][1-9a-fA-F]|[57][0-9aA]|5[fF]|7[eE])/gv;

/**
 * @param {string} urlString
 * @return {string}
 */
function normalizeUrl(urlString) {
  const trimmedUrl = urlString.trim();
  const hasRelativeProtocol = trimmedUrl.startsWith('//');

  let explicitPort;
  if (hasRelativeProtocol) {
    const afterScheme = trimmedUrl.slice(2);
    const end = afterScheme.search(/[\/?#]/v);
    const authority = end === -1 ? afterScheme : afterScheme.slice(0, end);
    const hostPort = authority.slice(authority.lastIndexOf('@') + 1);
    const match = hostPort.match(/:(\d+)$/v);
    if (match) {
      explicitPort = match[1];
    }
  }

  let urlObject;
  try {
    urlObject = new URL(
      hasRelativeProtocol ? `http:${trimmedUrl}` : trimmedUrl
    );
  } catch {
    return trimmedUrl;
  }

  if (!supportedProtocols.has(urlObject.protocol)) {
    return trimmedUrl;
  }

  // Remove duplicate slashes and decode unreserved octets
  if (urlObject.pathname) {
    urlObject.pathname = urlObject.pathname
      .replace(duplicateSlashRegex, '/')
      .replace(unreservedRegex, decodeURIComponent);
  }

  if (urlObject.hostname?.endsWith('.')) {
    urlObject.hostname = urlObject.hostname.slice(0, -1);
  }

  // Take advantage of many of the Node `url` normalizations
  let result = urlObject.toString();

  // Remove ending `/` for HTTP/HTTPS roots
  if (
    urlObject.protocol !== 'file:' &&
    urlObject.pathname === '/' &&
    urlObject.search === '' &&
    urlObject.hash === '' &&
    result.endsWith('/')
  ) {
    result = result.slice(0, -1);
  }

  // Restore relative protocol
  if (hasRelativeProtocol) {
    result = '//' + result.slice(7);
    if (explicitPort && Number(explicitPort) === 80) {
      const afterSlash = result.slice(2);
      const end = afterSlash.search(/[\/?#]/v);
      if (end === -1) {
        result += `:${explicitPort}`;
      } else {
        result =
          result.slice(0, 2 + end) + `:${explicitPort}` + result.slice(2 + end);
      }
    }
  }

  return result;
}
export { normalizeUrl as default };
