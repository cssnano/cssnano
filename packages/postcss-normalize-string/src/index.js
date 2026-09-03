import { tokenize, TokenType } from '@csstools/css-tokenizer';

/*
 * Constants (parser usage)
 */

const SINGLE_QUOTE = "'".charCodeAt(0);
const DOUBLE_QUOTE = '"'.charCodeAt(0);
const BACKSLASH = '\\'.charCodeAt(0);
const NEWLINE = '\n'.charCodeAt(0);
const SPACE = ' '.charCodeAt(0);
const FEED = '\f'.charCodeAt(0);
const TAB = '\t'.charCodeAt(0);
const CR = '\r'.charCodeAt(0);

const WORD_END = /[ \n\t\r\f'"\\]/g;

/*
 * Constants (node type strings)
 */

const C_STRING = 'string';
const C_ESCAPED_SINGLE_QUOTE = 'escapedSingleQuote';
const C_ESCAPED_DOUBLE_QUOTE = 'escapedDoubleQuote';
const C_SINGLE_QUOTE = 'singleQuote';
const C_DOUBLE_QUOTE = 'doubleQuote';
const C_NEWLINE = 'newline';
const C_SINGLE = 'single';

/*
 * Literals
 */

const L_SINGLE_QUOTE = `'`;
const L_DOUBLE_QUOTE = `"`;
const L_NEWLINE = `\\\n`;

/*
 * Parser nodes
 */

const T_ESCAPED_SINGLE_QUOTE = { type: C_ESCAPED_SINGLE_QUOTE, value: `\\'` };
const T_ESCAPED_DOUBLE_QUOTE = { type: C_ESCAPED_DOUBLE_QUOTE, value: `\\"` };
const T_SINGLE_QUOTE = { type: C_SINGLE_QUOTE, value: L_SINGLE_QUOTE };
const T_DOUBLE_QUOTE = { type: C_DOUBLE_QUOTE, value: L_DOUBLE_QUOTE };
const T_NEWLINE = { type: C_NEWLINE, value: L_NEWLINE };

/** @typedef {typeof T_ESCAPED_SINGLE_QUOTE | typeof T_ESCAPED_DOUBLE_QUOTE | typeof T_SINGLE_QUOTE | typeof T_NEWLINE} StringAstNode */
/**
 * @typedef {{nodes: StringAstNode[],
 *            types: {escapedSingleQuote: number, escapedDoubleQuote: number, singleQuote: number, doubleQuote: number},
 *            quotes: boolean}} StringAst
 */

/**
 * @param {StringAst} ast
 * @return {string}
 */
function stringify(ast) {
  let str = '';
  for (const { value } of ast.nodes) {
    // Collapse multiple line strings automatically
    if (value !== L_NEWLINE) {
      str += value;
    }
  }
  return str;
}

/**
 * @param {string} str
 * @return {StringAst}
 */
function parse(str) {
  let code, next, value;
  let pos = 0;
  const len = str.length;

  /** @type StringAst */
  const ast = {
    nodes: [],
    types: {
      escapedSingleQuote: 0,
      escapedDoubleQuote: 0,
      singleQuote: 0,
      doubleQuote: 0,
    },
    quotes: false,
  };

  while (pos < len) {
    code = str.charCodeAt(pos);

    switch (code) {
      case SPACE:
      case TAB:
      case CR:
      case FEED:
        next = pos;

        do {
          next += 1;
          code = str.charCodeAt(next);
        } while (
          code === SPACE ||
          code === NEWLINE ||
          code === TAB ||
          code === CR ||
          code === FEED
        );

        ast.nodes.push({
          type: 'space',
          value: str.slice(pos, next),
        });
        pos = next - 1;
        break;
      case SINGLE_QUOTE:
        ast.nodes.push(T_SINGLE_QUOTE);
        ast.types[C_SINGLE_QUOTE]++;
        ast.quotes = true;
        break;
      case DOUBLE_QUOTE:
        ast.nodes.push(T_DOUBLE_QUOTE);
        ast.types[C_DOUBLE_QUOTE]++;
        ast.quotes = true;
        break;
      case BACKSLASH:
        next = pos + 1;

        if (str.charCodeAt(next) === SINGLE_QUOTE) {
          ast.nodes.push(T_ESCAPED_SINGLE_QUOTE);
          ast.types[C_ESCAPED_SINGLE_QUOTE]++;
          ast.quotes = true;
          pos = next;
          break;
        } else if (str.charCodeAt(next) === DOUBLE_QUOTE) {
          ast.nodes.push(T_ESCAPED_DOUBLE_QUOTE);
          ast.types[C_ESCAPED_DOUBLE_QUOTE]++;
          ast.quotes = true;
          pos = next;
          break;
        } else if (str.charCodeAt(next) === NEWLINE) {
          ast.nodes.push(T_NEWLINE);
          pos = next;
          break;
        }
      /*
       * We need to fall through here to handle the token as
       * a whole word. The missing 'break' is intentional.
       */
      // oxlint-disable-next-line no-fallthrough
      default:
        WORD_END.lastIndex = pos + 1;
        WORD_END.test(str);

        if (WORD_END.lastIndex === 0) {
          next = len - 1;
        } else {
          next = WORD_END.lastIndex - 2;
        }

        value = str.slice(pos, next + 1);

        ast.nodes.push({
          type: C_STRING,
          value,
        });

        pos = next;
    }
    pos++;
  }

  return ast;
}

/**
 * @param {{quote: string, value: string}} node
 * @param {StringAst} ast
 * @return {void}
 */
function changeWrappingQuotes(node, ast) {
  const { types } = ast;

  if (types[C_SINGLE_QUOTE] || types[C_DOUBLE_QUOTE]) {
    return;
  }

  if (
    node.quote === L_SINGLE_QUOTE &&
    types[C_ESCAPED_SINGLE_QUOTE] > 0 &&
    !types[C_ESCAPED_DOUBLE_QUOTE]
  ) {
    node.quote = L_DOUBLE_QUOTE;
  }

  if (
    node.quote === L_DOUBLE_QUOTE &&
    types[C_ESCAPED_DOUBLE_QUOTE] > 0 &&
    !types[C_ESCAPED_SINGLE_QUOTE]
  ) {
    node.quote = L_SINGLE_QUOTE;
  }

  ast.nodes = changeChildQuotes(ast.nodes, node.quote);
}
/**
 * @param {StringAstNode[]} childNodes
 * @param {string} parentQuote
 * @return {StringAstNode[]}
 */
function changeChildQuotes(childNodes, parentQuote) {
  const updatedChildren = [];
  for (const child of childNodes) {
    if (
      child.type === C_ESCAPED_DOUBLE_QUOTE &&
      parentQuote === L_SINGLE_QUOTE
    ) {
      updatedChildren.push(T_DOUBLE_QUOTE);
    } else if (
      child.type === C_ESCAPED_SINGLE_QUOTE &&
      parentQuote === L_DOUBLE_QUOTE
    ) {
      updatedChildren.push(T_SINGLE_QUOTE);
    } else {
      updatedChildren.push(child);
    }
  }
  return updatedChildren;
}

/**
 * @param {string} value
 * @return {boolean}
 */
function isClosedString(value) {
  if (
    value.length < 2 ||
    (value[0] !== L_SINGLE_QUOTE && value[0] !== L_DOUBLE_QUOTE)
  ) {
    return false;
  }

  let backslashes = 0;
  for (
    let index = value.length - 2;
    index >= 0 && value[index] === '\\';
    index--
  ) {
    backslashes++;
  }

  return value.at(-1) === value[0] && backslashes % 2 === 0;
}

/**
 * @param {string} value
 * @param {'single' | 'double'} preferredQuote
 * @return {string}
 */
function normalize(value, preferredQuote) {
  if (!value || !value.length) {
    return value;
  }

  const chunks = [];
  let cursor = 0;
  for (const [type, raw, start, end] of tokenize({ css: value })) {
    if (type !== TokenType.String) continue;
    if (!isClosedString(raw)) continue;
    const quote = raw[0];
    const child = {
      quote,
      // The closure check makes removing both delimiters safe here. Keeping
      // the raw interior preserves escapes for quote selection and output.
      value: raw.slice(1, -1),
    };
    const ast = parse(child.value);
    if (ast.quotes) changeWrappingQuotes(child, ast);
    else
      child.quote =
        preferredQuote === C_SINGLE ? L_SINGLE_QUOTE : L_DOUBLE_QUOTE;
    chunks.push(value.slice(cursor, start));
    chunks.push(child.quote + stringify(ast) + child.quote);
    cursor = end + 1;
  }
  if (cursor === 0) return value;
  chunks.push(value.slice(cursor));
  return chunks.join('');
}

/**
 * @param {string} original
 * @param {Map<string, string>} cache
 * @param {'single' | 'double'} preferredQuote
 * @return {string}
 */
function minify(original, cache, preferredQuote) {
  const key = original + '|' + preferredQuote;
  if (cache.has(key)) {
    return /** @type {string} */ (cache.get(key));
  }
  const newValue = normalize(original, preferredQuote);
  cache.set(key, newValue);
  return newValue;
}

/** @param {import('postcss').Declaration} decl @param {string} value */
function assignValue(decl, value) {
  decl.value = value;
  if (decl.raws.value?.raw) decl.raws.value = { raw: value, value };
}

/** @typedef {{preferredQuote?: 'double' | 'single'}} Options */
/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts) {
  const { preferredQuote } = Object.assign(
    {},
    {
      preferredQuote: 'double',
    },
    opts
  );

  return {
    postcssPlugin: 'postcss-normalize-string',

    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const cache = new Map();

      css.walk((node) => {
        switch (node.type) {
          case 'rule':
            node.selector = minify(node.selector, cache, preferredQuote);
            break;
          case 'decl':
            {
              const value =
                node.raws.value?.value === node.value
                  ? (node.raws.value.raw ?? node.value)
                  : node.value;
              assignValue(node, minify(value, cache, preferredQuote));
            }
            break;
          case 'atrule':
            node.params = minify(node.params, cache, preferredQuote);
            break;
        }
      });
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
