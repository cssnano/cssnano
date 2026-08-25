import {
  isFunctionNode,
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';
import {
  isTokenComma,
  isTokenDelim,
  isTokenIdent,
  tokenize,
} from '@csstools/css-tokenizer';
import mappings from './lib/map.js';

const repeatPropertyRegex = /^(background(-repeat)?|(-\w+-)?mask-repeat)$/i;
/**
 * @param {unknown} item
 * @param {number} index
 * @return {boolean}
 */
function evenValues(item, index) {
  return index % 2 === 0;
}

const repeatKeywords = new Set(mappings.values());

/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue} node
 * @return {boolean}
 */
function isCommaNode(node) {
  return isTokenNode(node) && isTokenComma(node.value);
}

const variableFunctions = new Set(['var', 'env', 'constant']);
/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue} node
 * @return {boolean}
 */
function isVariableFunctionNode(node) {
  if (!isFunctionNode(node)) {
    return false;
  }

  return variableFunctions.has(node.getName().toLowerCase());
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  const nodes = parseListOfComponentValues(tokenize({ css: value }));

  if (nodes.length === 1) {
    return value;
  }
  /** @type {{start: number?, end: number?}[]} */
  const ranges = [];
  let rangeIndex = 0;
  let shouldContinue = true;

  for (const [index, node] of nodes.entries()) {
    // After comma (`,`) follows next background
    if (isCommaNode(node)) {
      rangeIndex += 1;
      shouldContinue = true;

      continue;
    }

    if (!shouldContinue) {
      continue;
    }

    // After separator (`/`) follows `background-size` values
    // Avoid them
    if (isSlashNode(node)) {
      shouldContinue = false;

      continue;
    }

    if (!ranges[rangeIndex]) {
      ranges[rangeIndex] = {
        start: null,
        end: null,
      };
    }

    // Do not try to be processed `var and `env` function inside background
    if (isVariableFunctionNode(node)) {
      shouldContinue = false;
      ranges[rangeIndex].start = null;
      ranges[rangeIndex].end = null;

      continue;
    }

    const isRepeatKeyword =
      isTokenNode(node) &&
      isTokenIdent(node.value) &&
      repeatKeywords.has(node.toString().toLowerCase());

    if (ranges[rangeIndex].start === null && isRepeatKeyword) {
      ranges[rangeIndex].start = index;
      ranges[rangeIndex].end = index;

      continue;
    }

    if (ranges[rangeIndex].start !== null) {
      if (node.type !== 'whitespace' && isRepeatKeyword) {
        ranges[rangeIndex].end = index;
      }
    }
  }

  for (const range of ranges) {
    if (range.start === null) {
      continue;
    }

    const rangeNodes = nodes.slice(
      range.start,
      /** @type {number} */ (range.end) + 1
    );

    if (rangeNodes.length !== 3) {
      continue;
    }
    const key = rangeNodes
      .filter(evenValues)
      .map((n) => n.toString().toLowerCase())
      .toString();

    const match = mappings.get(key);

    if (match) {
      nodes[range.start] = match;
      nodes[range.start + 1] = nodes[range.start + 2] = '';
    }
  }

  return nodes
    .map((node) => (typeof node === 'string' ? node : node.toString()))
    .join('');
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function isSlashNode(node) {
  return isTokenNode(node) && isTokenDelim(node.value) && node.value[1] === '/';
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-repeat-style',
    prepare() {
      const cache = new Map();
      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls(repeatPropertyRegex, (decl) => {
            const value = decl.value;

            if (!value) {
              return;
            }

            if (cache.has(value)) {
              decl.value = cache.get(value);

              return;
            }

            const result = transform(value);

            decl.value = result;
            cache.set(value, result);
          });
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
