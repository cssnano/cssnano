/* Derived from normalize-url https://github.com/sindresorhus/normalize-url/main/index.js by Sindre Sorhus.
   Data URLs are intentionally out of scope: the plugin passes them through unchanged. */

const supportedProtocols = new Set(['https:', 'http:', 'file:']);
const protocolRegex = /^(?!(?:\w+:)?\/\/)|^\/\//v;
const relativePathRegex = /^\.*\//v;
const trailingDotRegex = /\.$/v;
const trailingSlashRegex = /\/$/v;
const httpProtocolRegex = /^http:\/\//v;

/**
 * @param {string} urlString
 * @return {boolean} */
function hasCustomProtocol(urlString) {
  try {
    const { protocol } = new URL(urlString);
    return protocol.endsWith(':') && !supportedProtocols.has(protocol);
  } catch {
    return false;
  }
}

/**
 * @param {string} urlString
 * @return {string}
 */
function normalizeUrl(urlString) {
  const trimmedUrl = urlString.trim();

  if (hasCustomProtocol(trimmedUrl)) {
    return trimmedUrl;
  }

  const hasRelativeProtocol = trimmedUrl.startsWith('//');
  const isRelativeUrl =
    !hasRelativeProtocol && relativePathRegex.test(trimmedUrl);

  // Prepend protocol
  const withProtocol = isRelativeUrl
    ? trimmedUrl
    : trimmedUrl.replace(protocolRegex, 'http:');

  const urlObject = new URL(withProtocol);

  // Remove duplicate slashes if not preceded by a protocol
  if (urlObject.pathname) {
    urlObject.pathname = urlObject.pathname.replace(
      /(?<!\b[a-z][a-z\d+\-.]{1,50}:)\/{2,}/gv,
      '/'
    );
  }

  // Decode URI octets
  if (urlObject.pathname) {
    try {
      urlObject.pathname = decodeURI(urlObject.pathname);
    } catch {
      /* Do nothing */
    }
  }

  if (urlObject.hostname) {
    // Remove trailing dot
    urlObject.hostname = urlObject.hostname.replace(trailingDotRegex, '');
  }

  // Take advantage of many of the Node `url` normalizations
  let result = urlObject.toString();

  // Remove ending `/`
  if (urlObject.pathname === '/' && urlObject.hash === '') {
    result = result.replace(trailingSlashRegex, '');
  }

  // Restore relative protocol
  if (hasRelativeProtocol) {
    result = result.replace(httpProtocolRegex, '//');
  }

  return result;
}
export default normalizeUrl;
