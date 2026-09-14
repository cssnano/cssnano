/*
 * Encoding is identical to encodeURIComponent, per the WHATWG URL Standard,
 * since it can produce standard input.
 */
const encode = encodeURIComponent;

const utf8Decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const utf8Encoder = new TextEncoder();

/**
 * Checks whether a byte is an ASCII hex digit:
 * 0-9 (0x30-0x39), A-F (0x41-0x46), a-f (0x61-0x66)
 * @param {number} byte
 * @return {boolean}
 */
function isHexDigit(byte) {
  return (
    (byte >= 0x30 && byte <= 0x39) ||
    (byte >= 0x41 && byte <= 0x46) ||
    (byte >= 0x61 && byte <= 0x66)
  );
}

/**
 * Decodes a hex character byte to its integer value (0-15).
 * @param {number} byte
 * @return {number}
 */
function hexVal(byte) {
  if (byte <= 0x39) return byte - 0x30;
  if (byte <= 0x46) return byte - 0x41 + 10;
  return byte - 0x61 + 10;
}

/**
 * Percent-decodes a string according to WHATWG URL Standard § 1.3.
 * This is more tolerant than decodeURIComponent.
 *
 * @param {string} input
 * @return {string}
 */
function decode(input) {
  if (!input.includes('%')) {
    return input;
  }

  const bytes = utf8Encoder.encode(input);
  const len = bytes.length;
  let outIdx = 0;

  for (let i = 0; i < len; i++) {
    const byte = bytes[i];
    if (
      byte === 0x25 &&
      i + 2 < len &&
      isHexDigit(bytes[i + 1]) &&
      isHexDigit(bytes[i + 2])
    ) {
      bytes[outIdx++] = hexVal(bytes[i + 1]) * 16 + hexVal(bytes[i + 2]);
      i += 2;
    } else {
      bytes[outIdx++] = byte;
    }
  }

  try {
    return utf8Decoder.decode(bytes.subarray(0, outIdx));
  } catch {
    throw new URIError('Malformed percent-encoded UTF-8 sequence in data URI');
  }
}

export { encode, decode };
