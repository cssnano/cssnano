/* Derived from normalize-url https://github.com/sindresorhus/normalize-url/main/index.js by Sindre Sorhus */
import cssnanoUtils from 'cssnano-utils';

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
const DATA_URL_DEFAULT_MIME_TYPE = 'text/plain';
const DATA_URL_DEFAULT_CHARSET = 'us-ascii';
const { asciiLowerCase } = cssnanoUtils;

const supportedProtocols = new Set(['https:', 'http:', 'file:']);
const dataUrlRegex = /^data:(?<type>[^,]*?),(?<data>[^#]*?)(?:#(?<hash>.*))?$/v;
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
 * @return {string} */
function normalizeDataURL(urlString) {
  const source = asciiLowerCase(urlString.slice(0, 5)) + urlString.slice(5);
  const match = dataUrlRegex.exec(source);

  if (!match) {
    throw new Error(`Invalid URL: ${urlString}`);
  }

  const { type, data, hash } =
    /** @type {{type: string, data: string, hash: string}} */ (match.groups);
  const mediaType = type.split(';');

  let isBase64 = false;
  if (asciiLowerCase(mediaType[mediaType.length - 1] ?? '') === 'base64') {
    mediaType.pop();
    isBase64 = true;
  }

  // Lowercase MIME type
  const mimeType = asciiLowerCase(mediaType.shift() ?? '');
  const attributes = mediaType
    .map(
      /** @type {(string: string) => string} */ (attribute) => {
        let [key, value = ''] = attribute
          .split('=')
          .map(
            /** @type {(string: string) => string} */ (string) => string.trim()
          );

        // Lowercase `charset`
        key = asciiLowerCase(key);
        if (key === 'charset') {
          value = asciiLowerCase(value);

          if (value === DATA_URL_DEFAULT_CHARSET) {
            return '';
          }
        }

        return `${key}${value ? `=${value}` : ''}`;
      }
    )
    .filter(Boolean);

  const normalizedMediaType = [...attributes];

  if (isBase64) {
    normalizedMediaType.push('base64');
  }

  if (
    normalizedMediaType.length > 0 ||
    (mimeType && mimeType !== DATA_URL_DEFAULT_MIME_TYPE)
  ) {
    normalizedMediaType.unshift(mimeType);
  }
  return `data:${normalizedMediaType.join(';')},${isBase64 ? data.trim() : data}${hash ? `#${hash}` : ''}`;
}

/**
 * @param {string} urlString
 * @return {string}
 */
function normalizeUrl(urlString) {
  const trimmedUrl = urlString.trim();

  // Data URL
  if (/^[dD][aA][tT][aA]:/v.test(trimmedUrl)) {
    return normalizeDataURL(trimmedUrl);
  }

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
