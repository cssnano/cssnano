import { TokenType } from '@csstools/css-tokenizer';
import { optimize } from 'svgo';
import cssnanoUtils from 'cssnano-utils';
import { encode, decode } from './lib/url.js';

const PLUGIN = 'postcss-svgo';
const { applyEdits, asciiLowerCase, balancedTokens, decoded } = cssnanoUtils;
const dataURIPattern =
  /^data:image\/svg\+xml(?:\s*;\s*(?:charset\s*=\s*(?:"utf-?8"|'utf-?8'|utf-?8)|utf-?8|base64))*\s*$/v;
// eslint-disable-next-line no-control-regex
const forbiddenInUnquotedUrl = /[\s\(\)"'\\\x00-\x08\x0b\x0e-\x1f\x7f]/v;

/**
 * Escapes the one character of 'data:image/svg+xml' that is a regex
 * quantifier; v-mode forbids identity escapes of characters like ':'.
 * @param {string} ch
 * @return {string}
 */
function escapeRegExpChar(ch) {
  return ch === '+' ? '\\+' : ch;
}

// Fast-path guard: every position accepts the literal character or any CSS
// escape (d\61ta:...), so escaped URIs still reach the tokenizer. The
// tokenizer stays authoritative, so over-matching only costs one extra pass.
const svgDataURI = new RegExp(
  [...'data:image/svg+xml']
    .map(
      (ch) =>
        `(?:${escapeRegExpChar(ch)}|\\\\(?:[0-9a-fA-F]{1,6}\\s?|[\\s\\S]))`
    )
    .join(''),
  'iv'
);

const needsEscapeDoubleQuote = /["\\\r\n\f]/v;
const needsEscapeSingleQuote = /['\\\r\n\f]/v;
const escapeDoubleQuotePattern = /\r\n|["\\\r\n\f]/gv;
const escapeSingleQuotePattern = /\r\n|['\\\r\n\f]/gv;

const nonHashEscapePattern = /%(?!23)[0-9a-fA-F]{2}/iv;

/**
 * Value of an ASCII hex digit code, or -1 when the code is not a hex digit.
 * @param {number} code
 * @return {number}
 */
function hexDigitValue(code) {
  if (code >= 0x30 && code <= 0x39) return code - 0x30;
  if (code >= 0x41 && code <= 0x46) return code - 0x41 + 10;
  if (code >= 0x61 && code <= 0x66) return code - 0x61 + 10;
  return -1;
}

/**
 * Reads the logical character at `i`: %XX byte escapes resolve to their
 * character (WHATWG URL § 1.3 percent-decoding) and ASCII uppercase folds to
 * lowercase, so raw, percent-encoded, and mixed payloads scan through one code
 * path. Invalid escapes read as a literal '%'. Returns null at end of input.
 * @param {string} payload
 * @param {number} i
 * @param {boolean} hasPercent
 * @return {{ch: string, next: number} | null}
 */
function readLogicalChar(payload, i, hasPercent) {
  if (i >= payload.length) return null;
  const code = payload.charCodeAt(i);
  if (hasPercent && code === 0x25 /* % */) {
    const high = hexDigitValue(payload.charCodeAt(i + 1));
    const low = high === -1 ? -1 : hexDigitValue(payload.charCodeAt(i + 2));
    if (low !== -1) {
      const byte = high * 16 + low;
      const ch =
        byte >= 0x41 && byte <= 0x5a
          ? String.fromCharCode(byte + 0x20)
          : String.fromCharCode(byte);
      return { ch, next: i + 3 };
    }
  }
  const ch =
    code >= 0x41 && code <= 0x5a /* A-Z */
      ? String.fromCharCode(code + 0x20)
      : payload[i];
  return { ch, next: i + 1 };
}

/**
 * Returns the index past a logical character equal to `ch` at `i`, or -1.
 * `ch` must be lowercase.
 * @param {string} payload
 * @param {number} i
 * @param {string} ch
 * @param {boolean} hasPercent
 * @return {number}
 */
function acceptChar(payload, i, ch, hasPercent) {
  const char = readLogicalChar(payload, i, hasPercent);
  if (!char || char.ch !== ch) return -1;
  return char.next;
}

/**
 * Matches a lowercase literal such as a tag name, where each character may
 * appear raw or percent-encoded. Returns the index past the literal, or -1.
 * @param {string} payload
 * @param {number} start
 * @param {string} word
 * @param {boolean} hasPercent
 * @return {number}
 */
function acceptWord(payload, start, word, hasPercent) {
  let i = start;
  for (let k = 0; k < word.length; k++) {
    const next = acceptChar(payload, i, word[k], hasPercent);
    if (next === -1) return -1;
    i = next;
  }
  return i;
}

/**
 * @param {string} ch
 * @return {boolean}
 */
function isWhitespaceChar(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f';
}

/**
 * @param {string} ch
 * @return {boolean}
 */
function isNameChar(ch) {
  return (
    (ch >= 'a' && ch <= 'z') ||
    (ch >= '0' && ch <= '9') ||
    ch === '-' ||
    ch === '_' ||
    ch === ':' ||
    ch === '.'
  );
}

/**
 * @param {string} payload
 * @param {number} start
 * @param {boolean} hasPercent
 * @return {number} index past any run of whitespace
 */
function skipWhitespace(payload, start, hasPercent) {
  let i = start;
  while (true) {
    const char = readLogicalChar(payload, i, hasPercent);
    if (!char || !isWhitespaceChar(char.ch)) break;
    i = char.next;
  }
  return i;
}

/**
 * @param {string} payload
 * @param {number} i
 * @param {boolean} hasPercent
 * @return {boolean} true when a name character starts at `i`
 */
function isNameCharAt(payload, i, hasPercent) {
  const char = readLogicalChar(payload, i, hasPercent);
  return char !== null && isNameChar(char.ch);
}

/**
 * Skips the body of a comment following '<!--'. Returns the index past '-->',
 * or -1 when it is unterminated.
 * @param {string} payload
 * @param {number} start
 * @param {boolean} hasPercent
 * @return {number}
 */
function skipCommentBody(payload, start, hasPercent) {
  let i = start;
  while (true) {
    const char = readLogicalChar(payload, i, hasPercent);
    if (!char) return -1;
    if (char.ch === '-') {
      const afterSecondDash = acceptChar(payload, char.next, '-', hasPercent);
      if (afterSecondDash !== -1) {
        const end = acceptChar(payload, afterSecondDash, '>', hasPercent);
        if (end !== -1) return end;
        i = afterSecondDash;
        continue;
      }
    }
    i = char.next;
  }
}

/**
 * Skips the body of a processing instruction following '<?'. Returns the index past '?>',
 * or -1 when it is unterminated.
 * @param {string} payload
 * @param {number} start
 * @param {boolean} hasPercent
 * @return {number}
 */
function skipProcessingInstructionBody(payload, start, hasPercent) {
  let i = start;
  while (true) {
    const char = readLogicalChar(payload, i, hasPercent);
    if (!char) return -1;
    if (char.ch === '?') {
      const end = acceptChar(payload, char.next, '>', hasPercent);
      if (end !== -1) return end;
    }
    i = char.next;
  }
}

/**
 * Skips the body of a DOCTYPE declaration following '<!doctype', honoring quoted
 * system literals and the bracketed internal subset. Returns the index past '>', or -1.
 * @param {string} payload
 * @param {number} start
 * @param {boolean} hasPercent
 * @return {number}
 */
function skipDoctypeBody(payload, start, hasPercent) {
  let i = start;
  let bracketDepth = 0;
  let quote = '';
  while (true) {
    const char = readLogicalChar(payload, i, hasPercent);
    if (!char) return -1;
    const ch = char.ch;
    if (quote !== '') {
      if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '[') {
      bracketDepth += 1;
    } else if (ch === ']') {
      bracketDepth -= 1;
    } else if (ch === '>' && bracketDepth === 0) {
      return char.next;
    }
    i = char.next;
  }
}

/**
 * Skips the body of a CDATA section following '<![cdata['. Returns the index past ']]>',
 * or -1 when it is unterminated.
 * @param {string} payload
 * @param {number} start
 * @param {boolean} hasPercent
 * @return {number}
 */
function skipCdataBody(payload, start, hasPercent) {
  let i = start;
  while (true) {
    const char = readLogicalChar(payload, i, hasPercent);
    if (!char) return -1;
    if (char.ch === ']') {
      const afterSecondBracket = acceptChar(
        payload,
        char.next,
        ']',
        hasPercent
      );
      if (afterSecondBracket !== -1) {
        const end = acceptChar(payload, afterSecondBracket, '>', hasPercent);
        if (end !== -1) return end;
      }
    }
    i = char.next;
  }
}

/**
 * @typedef {{end: number, selfClosing: boolean}} TagEnd
 */

/**
 * Scans the remainder of a tag (attributes and whitespace) to its `>` or
 * `/>`, quote-aware so delimiters inside attribute values never end the tag.
 * Returns null when the tag is unterminated.
 * @param {string} payload
 * @param {number} start position just past the tag name
 * @param {boolean} hasPercent
 * @return {TagEnd | null}
 */
function skipTagBody(payload, start, hasPercent) {
  let i = start;
  let quote = '';
  while (true) {
    const char = readLogicalChar(payload, i, hasPercent);
    if (!char) return null;
    const ch = char.ch;
    if (quote !== '') {
      if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return { end: char.next, selfClosing: false };
    } else if (ch === '/') {
      const end = acceptChar(payload, char.next, '>', hasPercent);
      if (end !== -1) return { end, selfClosing: true };
    }
    i = char.next;
  }
}

/**
 * Dispatches and skips constructs starting with '<!' (comment, CDATA, or DOCTYPE).
 * Returns the index past the construct, or -1.
 * @param {string} payload
 * @param {number} start position past '<!'
 * @param {boolean} hasPercent
 * @return {number}
 */
function skipExclamationConstruct(payload, start, hasPercent) {
  const thirdChar = readLogicalChar(payload, start, hasPercent);
  if (!thirdChar) return -1;
  if (thirdChar.ch === '-') {
    const afterSecondDash = acceptChar(
      payload,
      thirdChar.next,
      '-',
      hasPercent
    );
    if (afterSecondDash === -1) return -1;
    return skipCommentBody(payload, afterSecondDash, hasPercent);
  }
  if (thirdChar.ch === '[') {
    const afterCdata = acceptWord(
      payload,
      thirdChar.next,
      'cdata[',
      hasPercent
    );
    if (afterCdata === -1) return -1;
    return skipCdataBody(payload, afterCdata, hasPercent);
  }
  if (thirdChar.ch === 'd') {
    const afterDoctype = acceptWord(
      payload,
      thirdChar.next,
      'octype',
      hasPercent
    );
    if (afterDoctype === -1) return -1;
    return skipDoctypeBody(payload, afterDoctype, hasPercent);
  }
  return -1;
}

/**
 * Skips everything the XML grammar allows before the root element:
 * whitespace, comments, processing instructions, and DOCTYPE declarations.
 * Returns the index of the first construct that is none of these, or -1 at
 * end of input or when a prolog construct is malformed.
 * @param {string} payload
 * @param {number} start
 * @param {boolean} hasPercent
 * @return {number}
 */
function skipProlog(payload, start, hasPercent) {
  let i = start;
  for (;;) {
    i = skipWhitespace(payload, i, hasPercent);
    if (i >= payload.length) return -1;
    const char = readLogicalChar(payload, i, hasPercent);
    if (!char || char.ch !== '<') return i;

    const nextChar = readLogicalChar(payload, char.next, hasPercent);
    if (!nextChar) return -1;

    if (nextChar.ch === '?') {
      const end = skipProcessingInstructionBody(
        payload,
        nextChar.next,
        hasPercent
      );
      if (end === -1) return -1;
      i = end;
      continue;
    }

    if (nextChar.ch === '!') {
      const end = skipExclamationConstruct(payload, nextChar.next, hasPercent);
      if (end === -1) return -1;
      i = end;
      continue;
    }

    return i;
  }
}

/**
 * Scans the root element's body for the index just past the root close tag,
 * tracking svg nesting depth so close tags inside comments or CDATA sections
 * never masquerade as the root close. Returns -1 when the body has no
 * determinate close.
 * @param {string} payload
 * @param {number} start position just past the root open tag
 * @param {boolean} hasPercent
 * @return {number}
 */
function scanRootBody(payload, start, hasPercent) {
  let i = start;
  // A close tag ends the root only when svg nesting returns to zero.
  let depth = 1;
  while (true) {
    const char = readLogicalChar(payload, i, hasPercent);
    if (!char) return -1;
    if (char.ch !== '<') {
      i = char.next;
      continue;
    }

    const nextChar = readLogicalChar(payload, char.next, hasPercent);
    if (!nextChar) return -1;

    if (nextChar.ch === '/') {
      const afterSlash = nextChar.next;
      const afterSpace = skipWhitespace(payload, afterSlash, hasPercent);
      const closeNameEnd = acceptWord(payload, afterSpace, 'svg', hasPercent);
      if (
        closeNameEnd !== -1 &&
        !isNameCharAt(payload, closeNameEnd, hasPercent)
      ) {
        const tag = skipTagBody(payload, closeNameEnd, hasPercent);
        if (tag === null) return -1;
        depth -= 1;
        if (depth === 0) return tag.end;
        i = tag.end;
        continue;
      }
      const otherTag = skipTagBody(payload, afterSpace, hasPercent);
      if (otherTag === null) return -1;
      i = otherTag.end;
      continue;
    }

    if (nextChar.ch === '?') {
      const end = skipProcessingInstructionBody(
        payload,
        nextChar.next,
        hasPercent
      );
      if (end === -1) return -1;
      i = end;
      continue;
    }

    if (nextChar.ch === '!') {
      const end = skipExclamationConstruct(payload, nextChar.next, hasPercent);
      if (end === -1) return -1;
      i = end;
      continue;
    }

    // Element start tag
    const openBracket = char.next;
    const openNameEnd = acceptWord(payload, openBracket, 'svg', hasPercent);
    if (openNameEnd !== -1 && !isNameCharAt(payload, openNameEnd, hasPercent)) {
      const tag = skipTagBody(payload, openNameEnd, hasPercent);
      if (tag === null) return -1;
      if (!tag.selfClosing) depth += 1;
      i = tag.end;
      continue;
    }
    const elementTag = skipTagBody(payload, openBracket, hasPercent);
    if (elementTag === null) return -1;
    i = elementTag.end;
  }
}

/**
 * Returns the index just past the svg root close tag, or -1 when the payload
 * has no determinate root close.
 *
 * One linear, quote-aware, character-level scan replaces the previous global
 * close-tag regex plus its sticky prolog and self-closing counterparts: the
 * prolog is skipped construct by construct, and the root open tag is consumed
 * with attribute values quoted off before the body scan takes over.
 * @param {string} rawPayload
 * @return {number}
 */
function findRootCloseIndex(rawPayload) {
  const hasPercent = rawPayload.includes('%');
  const rootStart = skipProlog(rawPayload, 0, hasPercent);
  if (rootStart === -1) return -1;

  // Root open tag: '<svg' followed by a non-name character.
  const afterRootName = acceptWord(rawPayload, rootStart, '<svg', hasPercent);
  if (afterRootName === -1) {
    return -1;
  }
  const charAfterRootName = readLogicalChar(
    rawPayload,
    afterRootName,
    hasPercent
  );
  if (!charAfterRootName || isNameChar(charAfterRootName.ch)) {
    return -1;
  }

  const rootOpen = skipTagBody(rawPayload, afterRootName, hasPercent);
  if (rootOpen === null) return -1;
  if (rootOpen.selfClosing) return rootOpen.end;

  return scanRootBody(rawPayload, rootOpen.end, hasPercent);
}

/**
 * Splits a payload into its SVG document and URL fragment. A '#' is a
 * fragment delimiter only once a verified root close precedes it; otherwise
 * it belongs to the document — an attribute value, say — and splitting there
 * would corrupt the payload.
 * @param {string} rawPayload
 * @return {{svgPayload: string, hashString: string}}
 */
function extractFragment(rawPayload) {
  if (!rawPayload.includes('#')) {
    return { svgPayload: rawPayload, hashString: '' };
  }

  const closeIndex = findRootCloseIndex(rawPayload);

  if (closeIndex !== -1) {
    const hash = rawPayload.indexOf('#', closeIndex);
    if (hash === -1) {
      return { svgPayload: rawPayload, hashString: '' };
    }
    return {
      svgPayload: rawPayload.slice(0, hash),
      hashString: rawPayload.slice(hash),
    };
  }

  return { svgPayload: rawPayload, hashString: '' };
}

/**
 * @param {string} svg the SVG string
 * @param {Options} opts
 * @return {string} the minified SVG string
 */
function minifySVG(svg, opts) {
  const result = optimize(svg, opts);

  return /** @type {import('svgo').Output}*/ (result).data;
}

/** @param {string} value @param {Options} opts @return {{value: string, quote?: string} | undefined} */
function optimizeDataUri(value, opts) {
  const comma = value.indexOf(',');
  if (comma === -1) return undefined;
  const loweredPrefix = asciiLowerCase(value.slice(0, comma));
  if (!dataURIPattern.test(loweredPrefix)) return undefined;

  const rawPayload = value.slice(comma + 1);

  if (loweredPrefix.includes('base64')) {
    const hash = rawPayload.indexOf('#');
    const base64String = rawPayload.slice(0, hash === -1 ? undefined : hash);
    const svg = Buffer.from(base64String, 'base64').toString('utf8');
    const result = minifySVG(svg, opts);
    const data = Buffer.from(result).toString('base64');
    const hashString = hash === -1 ? '' : rawPayload.slice(hash);
    return {
      value: 'data:image/svg+xml;base64,' + data + hashString,
      quote: undefined,
    };
  }

  const { svgPayload, hashString } = extractFragment(rawPayload);

  const decodedUri = decode(svgPayload);
  let isUriEncoded =
    decodedUri !== svgPayload && nonHashEscapePattern.test(svgPayload);

  if (opts.encode !== undefined) {
    isUriEncoded = opts.encode;
  }

  const result = minifySVG(decodedUri, opts);
  // encode() is encodeURIComponent, which already escapes '#' as %23; only the
  // unencoded branch needs the fragment delimiter escaped.
  const data = isUriEncoded ? encode(result) : result.replaceAll('#', '%23');
  return {
    value: 'data:image/svg+xml;charset=utf-8,' + data + hashString,
    quote: isUriEncoded ? '"' : "'",
  };
}

/** @param {string} match @return {string} */
function replaceEscape(match) {
  if (match === '\r\n' || match === '\r' || match === '\n') {
    return '\\a ';
  }
  if (match === '\f') {
    return '\\c ';
  }
  if (match === '\\') {
    return '\\\\';
  }
  return '\\' + match;
}

/** @param {string} value @param {string} quote @return {string} */
function escapeForQuote(value, quote) {
  if (!quote) return value;
  if (quote === '"') {
    if (!needsEscapeDoubleQuote.test(value)) return value;
    return value.replace(escapeDoubleQuotePattern, replaceEscape);
  }
  if (!needsEscapeSingleQuote.test(value)) return value;
  return value.replace(escapeSingleQuotePattern, replaceEscape);
}

/** @param {string} quote @param {string} value @return {string} */
function resolveQuote(quote, value) {
  if (!quote && forbiddenInUnquotedUrl.test(value)) {
    return value.includes('"') ? "'" : '"';
  }
  return quote;
}

/**
 * Finds the first string argument token inside url(...) or src(...), skipping leading
 * whitespace and comments, as defined in CSS Values 4 § 4.3.
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} tokens
 * @param {number} openIndex
 * @param {number} closeIndex
 * @return {import('@csstools/css-tokenizer').CSSToken | undefined}
 */
function findUrlStringToken(tokens, openIndex, closeIndex) {
  for (let j = openIndex + 1; j < closeIndex; j++) {
    const token = tokens[j];
    if (token[0] === TokenType.Whitespace || token[0] === TokenType.Comment) {
      continue;
    }
    if (token[0] === TokenType.String) {
      return token;
    }
    return undefined;
  }
  return undefined;
}

/**
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} tokens
 * @param {number} i
 * @param {NonNullable<ReturnType<typeof balancedTokens>>} balanced
 * @return {{ prefix: string, value: string, quote: string, start: number, end: number, isFunction: boolean, nextIndex: number } | undefined}
 */
function extractUrlPayload(tokens, i, balanced) {
  const token = tokens[i];
  if (token[0] === TokenType.URL) {
    return {
      prefix: token[1].slice(0, token[1].indexOf('(') + 1),
      value: decoded(token),
      quote: '',
      start: token[2],
      end: token[3] + 1,
      isFunction: false,
      nextIndex: i,
    };
  }

  const fnName = asciiLowerCase(decoded(token));
  if (
    token[0] !== TokenType.Function ||
    (fnName !== 'url' && fnName !== 'src')
  ) {
    return undefined;
  }

  const close = /** @type {number} */ (balanced.endForOpening(i));

  const stringToken = findUrlStringToken(tokens, i, close);
  if (!stringToken) {
    return {
      nextIndex: close,
      prefix: '',
      value: '',
      quote: '',
      start: -1,
      end: -1,
      isFunction: true,
    };
  }

  return {
    prefix: '',
    value: decoded(stringToken),
    quote: stringToken[1][0],
    start: stringToken[2],
    end: stringToken[3] + 1,
    isFunction: true,
    nextIndex: close,
  };
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {Options} opts
 * @param {import('postcss').Result} postcssResult
 * @return {void}
 */
function minify(decl, opts, postcssResult) {
  const original =
    decl.raws.value?.value === decl.value
      ? (decl.raws.value.raw ?? decl.value)
      : decl.value;
  const balanced = balancedTokens(original);
  if (!balanced) return;
  const tokens = balanced.tokens;
  /** @type {{start: number, end: number, text: string}[]} */
  const replacements = [];

  for (let i = 0; i < tokens.length; i++) {
    const parsed = extractUrlPayload(tokens, i, balanced);
    if (!parsed) continue;
    i = parsed.nextIndex;
    if (parsed.start === -1) continue;

    const { prefix, start, end, isFunction } = parsed;
    let { value, quote } = parsed;

    try {
      const optimized = optimizeDataUri(value, opts);
      if (!optimized) continue;
      value = optimized.value;
      const quoteToResolve =
        optimized.quote !== undefined ? optimized.quote : quote;
      quote = resolveQuote(quoteToResolve, value);
      value = escapeForQuote(value, quote);
    } catch (error) {
      decl.warn(postcssResult, `${error}`);
      continue;
    }

    replacements.push({
      start,
      end,
      text: isFunction
        ? quote + value + quote
        : prefix + quote + value + quote + ')',
    });
  }

  if (replacements.length === 0) return;
  decl.value = applyEdits(original, replacements);
  // Synchronize raw metadata so downstream readers cannot resurrect the
  // pre-minified value from raws.value.raw.
  if (decl.raws.value?.raw) {
    decl.raws.value = { raw: decl.value, value: decl.value };
  }
}
/** @typedef {{encode?: boolean} & import('svgo').Config} Options */
/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  return {
    postcssPlugin: PLUGIN,
    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers}  helpers
     */
    OnceExit(css, { result }) {
      css.walkDecls((decl) => {
        if (!svgDataURI.test(decl.value)) {
          return;
        }

        minify(decl, opts, result);
      });
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
