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
 * Splits a data URI payload into document and URL fragment per WHATWG URL standards.
 * The first '#' begins the fragment identifier.
 * @param {string} rawPayload
 * @return {{svgPayload: string, hashString: string}}
 */
function extractFragment(rawPayload) {
  const hash = rawPayload.indexOf('#');
  if (hash === -1) {
    return { svgPayload: rawPayload, hashString: '' };
  }
  return {
    svgPayload: rawPayload.slice(0, hash),
    hashString: rawPayload.slice(hash),
  };
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
  const { svgPayload, hashString } = extractFragment(rawPayload);

  if (loweredPrefix.includes('base64')) {
    const svg = Buffer.from(svgPayload, 'base64').toString('utf8');
    const result = minifySVG(svg, opts);
    if (rawPayload !== '' && !result) {
      throw new Error('Empty SVG output');
    }
    const data = Buffer.from(result).toString('base64');
    return {
      value: 'data:image/svg+xml;base64,' + data + hashString,
      quote: undefined,
    };
  }

  const decodedUri = decode(svgPayload);
  let isUriEncoded =
    decodedUri !== svgPayload && nonHashEscapePattern.test(svgPayload);

  if (opts.encode !== undefined) {
    isUriEncoded = opts.encode;
  }

  const result = minifySVG(decodedUri, opts);
  if (rawPayload !== '' && !result) {
    throw new Error('Empty SVG output');
  }
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
        if (
          !decl.value.includes('svg') &&
          !decl.value.includes('SVG') &&
          !decl.value.includes('\\')
        ) {
          return;
        }

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
