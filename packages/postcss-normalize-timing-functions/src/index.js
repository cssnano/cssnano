import {
  isTokenDimension,
  isTokenIdent,
  isTokenNumber,
  tokenize,
} from '@csstools/css-tokenizer';
import {
  isFunctionNode,
  isSimpleBlockNode,
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';

const animationTransitionRegex =
  /^(-\w+-)?(animation|transition)(-timing-function)?$/i;

/* Works because toString() normalizes the formatting,
   so comparing the string forms behaves the same as number equality*/
const conversions = new Map([
  [[0.25, 0.1, 0.25, 1].toString(), 'ease'],
  [[0, 0, 1, 1].toString(), 'linear'],
  [[0.42, 0, 1, 1].toString(), 'ease-in'],
  [[0, 0, 0.58, 1].toString(), 'ease-out'],
  [[0.42, 0, 0.58, 1].toString(), 'ease-in-out'],
]);

/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue} node
 * @return {number | undefined}
 */
function getNumber(node) {
  if (!isTokenNode(node)) {
    return;
  }

  if (!isTokenNumber(node.value) && !isTokenDimension(node.value)) {
    return;
  }

  return node.value[4].value;
}

/**
 * Return the non-whitespace children while rejecting whitespace between
 * arguments. This retains postcss-value-parser's malformed-input behavior.
 *
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} values
 * @return {import('@csstools/css-parser-algorithms').ComponentValue[]}
 */
function argumentsWithoutWhitespace(values) {
  const first = values.findIndex((node) => node.type !== 'whitespace');
  const last = values.findLastIndex((node) => node.type !== 'whitespace');

  if (first < 0) {
    return [];
  }

  const result = values.slice(first, last + 1);
  for (let index = 0; index < result.length; index++) {
    if (result[index].type !== 'whitespace') {
      continue;
    }

    let before = index - 1;
    while (before >= 0 && result[before].type === 'whitespace') before--;
    let after = index + 1;
    while (after < result.length && result[after].type === 'whitespace')
      after++;

    if (
      result[before]?.toString() !== ',' &&
      result[after]?.toString() !== ','
    ) {
      return [];
    }
  }

  return result.filter((node) => node.type !== 'whitespace');
}

/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} values
 * @param {string} first
 * @param {string} second
 * @return {boolean}
 */
function isStepPosition(values, first, second) {
  return (
    values.length === 3 &&
    isTokenNode(values[2]) &&
    isTokenIdent(values[2].value) &&
    (values[2].value[1].toLowerCase() === first ||
      values[2].value[1].toLowerCase() === second)
  );
}

/**
 * @param {import('@csstools/css-parser-algorithms').FunctionNode} node
 * @return {string | undefined}
 */
function replacementForSteps(node) {
  const values = argumentsWithoutWhitespace(node.value);
  const count = getNumber(values[0]);
  const isSingleStep = values.length >= 1 && count === 1;

  if (isSingleStep && isStepPosition(values, 'start', 'jump-start')) {
    return 'step-start';
  }

  if (isSingleStep && isStepPosition(values, 'end', 'jump-end')) {
    return 'step-end';
  }

  // The end case is actually the browser default, so it isn't required.
  if (values.length === 3 && isStepPosition(values, 'end', 'jump-end')) {
    return `${node.name[1]}${values[0].toString()})`;
  }
}

/**
 * @param {import('@csstools/css-parser-algorithms').FunctionNode} node
 * @return {string | undefined}
 */
function replacementForCubicBezier(node) {
  const values = argumentsWithoutWhitespace(node.value);
  if (
    values.length !== 7 ||
    values.some((value, index) => index % 2 === 1 && value.toString() !== ',')
  ) {
    return;
  }

  const numbers = values
    .filter((_value, index) => index % 2 === 0)
    .map(getNumber);

  if (numbers.some((value) => value === undefined)) {
    return;
  }

  return conversions.get(numbers.toString());
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  const nodes = parseListOfComponentValues(tokenize({ css: value }));

  /**
   * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} values
   * @return {string}
   */
  function serialize(values) {
    let output = '';

    for (const node of values) {
      if (isFunctionNode(node)) {
        const name = node.getName().toLowerCase();
        let replacement;
        if (name === 'steps') {
          replacement = replacementForSteps(node);
        } else if (name === 'cubic-bezier') {
          replacement = replacementForCubicBezier(node);
        }

        if (replacement) {
          output += replacement;
          continue;
        }
      }

      if (isFunctionNode(node) || isSimpleBlockNode(node)) {
        const source = node.toString();
        const inner = node.value.map((child) => child.toString()).join('');
        output += source.replace(inner, serialize(node.value));
        continue;
      }

      output += node.toString();
    }

    return output;
  }

  return serialize(nodes);
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-timing-functions',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const cache = new Map();

      css.walkDecls(animationTransitionRegex, (decl) => {
        const value = decl.value;

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
