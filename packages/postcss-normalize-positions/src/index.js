import {
  isFunctionNode,
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';
import {
  isTokenComma,
  isTokenDelim,
  isTokenDimension,
  isTokenIdent,
  isTokenNumber,
  isTokenPercentage,
  tokenize,
} from '@csstools/css-tokenizer';

const directionKeywords = new Set(['top', 'right', 'bottom', 'left', 'center']);

const center = '50%';
const horizontal = new Map([
  ['right', '100%'],
  ['left', '0'],
]);
const verticalValue = new Map([
  ['bottom', '100%'],
  ['top', '0'],
]);
const mathFunctions = new Set(['calc', 'min', 'max', 'clamp']);
const variableFunctions = new Set(['var', 'env', 'constant']);
const propFilterRegex =
  /^(background(-position)?|(-\w+-)?perspective-origin)$/i;

/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue} node
 * @return {boolean}
 */
function isCommaNode(node) {
  return isTokenNode(node) && isTokenComma(node.value);
}

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
 * @param {import('@csstools/css-parser-algorithms').ComponentValue} node
 * @return {boolean}
 */
function isMathFunctionNode(node) {
  if (!isFunctionNode(node)) {
    return false;
  }
  return mathFunctions.has(node.getName().toLowerCase());
}

/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue} node
 * @return {boolean}
 */
function isNumberNode(node) {
  if (!isWordNode(node)) {
    return false;
  }

  const value = Number.parseFloat(node.toString());

  return !Number.isNaN(value);
}

/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue} node
 * @return {boolean}
 */
function isDimensionNode(node) {
  return (
    isTokenNode(node) &&
    (isTokenDimension(node.value) || isTokenPercentage(node.value))
  );
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  const nodes = parseListOfComponentValues(tokenize({ css: value }));
  const ranges = collectRanges(nodes);
  const replacements = new Map();

  for (const range of ranges) {
    normalizeRange(nodes, range, replacements);
  }

  return nodes
    .map((node, index) => replacements.get(index) ?? node.toString())
    .join('');
}

/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes
 * @return {{start: number | null, end: number | null}[]}
 */
function collectRanges(nodes) {
  /** @type {{start: number | null, end: number | null}[]} */
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

    const isPositionKeyword =
      (isWordNode(node) &&
        directionKeywords.has(node.toString().toLowerCase())) ||
      isDimensionNode(node) ||
      isNumberNode(node) ||
      isMathFunctionNode(node);

    if (ranges[rangeIndex].start === null && isPositionKeyword) {
      ranges[rangeIndex].start = index;
      ranges[rangeIndex].end = index;

      continue;
    }

    if (ranges[rangeIndex].start !== null) {
      if (node.type !== 'whitespace' && isPositionKeyword) {
        ranges[rangeIndex].end = index;
      }
    }
  }

  return ranges;
}

/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} parsed
 * @param {{start: number | null, end: number | null}} range
 * @param {Map<number, string>} replacements
 * @return {void}
 */
function normalizeRange(parsed, range, replacements) {
  if (range.start === null || range.end === null) {
    return;
  }

  const nodes = parsed.slice(range.start, range.end + 1);

  if (nodes.length > 3) {
    return;
  }

  const firstNode = nodes[0].toString().toLowerCase();
  const secondNode = nodes[2] ? nodes[2].toString().toLowerCase() : null;

  if (nodes.length === 1 || secondNode === 'center') {
    normalizeSinglePosition(firstNode, secondNode, range.start, replacements);
    return;
  }

  normalizePairPosition(firstNode, secondNode, range.start, replacements);
}

/**
 * @param {string} firstNode
 * @param {string | null} secondNode
 * @return {void}
 */
function normalizeSinglePosition(firstNode, secondNode, start, replacements) {
  if (secondNode) {
    replacements.set(start + 1, '');
    replacements.set(start + 2, '');
  }

  const map = new Map([...horizontal, ['center', center]]);

  if (map.has(firstNode)) {
    replacements.set(start, /** @type {string}*/ (map.get(firstNode)));
  }
}

/**
 * @param {string} firstNode
 * @param {string | null} secondNode
 * @return {void}
 */
function normalizePairPosition(firstNode, secondNode, start, replacements) {
  if (secondNode === null) {
    return;
  }

  if (firstNode === 'center' && directionKeywords.has(secondNode)) {
    replacements.set(start, '');
    replacements.set(start + 1, '');

    if (horizontal.has(secondNode)) {
      replacements.set(
        start + 2,
        /** @type {string} */ (horizontal.get(secondNode))
      );
    }
    return;
  }

  if (horizontal.has(firstNode) && verticalValue.has(secondNode)) {
    replacements.set(start, /** @type {string} */ (horizontal.get(firstNode)));
    replacements.set(
      start + 2,
      /** @type {string} */ (verticalValue.get(secondNode))
    );
  } else if (verticalValue.has(firstNode) && horizontal.has(secondNode)) {
    replacements.set(start, /** @type {string} */ (horizontal.get(secondNode)));
    replacements.set(
      start + 2,
      /** @type {string} */ (verticalValue.get(firstNode))
    );
  }
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function isSlashNode(node) {
  return isTokenNode(node) && isTokenDelim(node.value) && node.value[1] === '/';
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function isWordNode(node) {
  return (
    isTokenNode(node) &&
    (isTokenIdent(node.value) ||
      isTokenNumber(node.value) ||
      isTokenDimension(node.value) ||
      isTokenPercentage(node.value))
  );
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-positions',

    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const cache = new Map();

      css.walkDecls(propFilterRegex, (decl) => {
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
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
