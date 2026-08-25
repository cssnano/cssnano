import {
  isFunctionNode,
  isSimpleBlockNode,
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';
import {
  isTokenComma,
  isTokenDimension,
  isTokenIdent,
  isTokenNumber,
  isTokenPercentage,
  tokenize,
} from '@csstools/css-tokenizer';
import isColorStop from './isColorStop.js';

const directionsToAngles = new Map([
  ['top', '0deg'],
  ['right', '90deg'],
  ['bottom', '180deg'],
  ['left', '270deg'],
]);
const mathFunctions = new Set(['calc', 'clamp', 'max', 'min']);

/** @param {import('@csstools/css-tokenizer').CSSToken} token */
function unit(token) {
  if (
    !isTokenNumber(token) &&
    !isTokenDimension(token) &&
    !isTokenPercentage(token)
  ) {
    return false;
  }
  let tokenUnit = '';
  if (isTokenDimension(token)) tokenUnit = token[4].unit;
  else if (isTokenPercentage(token)) tokenUnit = '%';
  return { number: token[1], unit: tokenUnit };
}

/** @param {{ number: string, unit: string }} a @param {{ number: string, unit: string }} b */
function isLessThan(a, b) {
  return (
    a.unit.toLowerCase() === b.unit.toLowerCase() &&
    Number.parseFloat(a.number) >= Number.parseFloat(b.number)
  );
}

/** @param {{ number: string, unit: string }} a @param {{ number: string, unit: string }} b */
function isLessThanOrEqual(a, b) {
  if (a.unit.toLowerCase() === b.unit.toLowerCase()) return isLessThan(a, b);
  const aNumber = Number.parseFloat(a.number);
  const bNumber = Number.parseFloat(b.number);
  if (aNumber === 0) return bNumber <= 0;
  if (bNumber === 0) return aNumber >= 0;
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function isPosition(node) {
  return isTokenNode(node) && unit(node.value) !== false;
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} argument */
function isColorStopArgument(argument) {
  const first = argument[0];
  if (!first) return false;
  if (isSimpleBlockNode(first)) return true;
  if (isFunctionNode(first))
    return !mathFunctions.has(first.getName().toLowerCase());
  return (
    isTokenNode(first) &&
    (first.value[0] === 'url-token' ||
      ((isTokenIdent(first.value) || first.value[0] === 'hash-token') &&
        isColorStop(first.toString())))
  );
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} argument @param {boolean} colorStopArgument */
function getPositions(argument, colorStopArgument) {
  return argument
    .slice(colorStopArgument ? 1 : 0)
    .filter((node) => node.type !== 'whitespace' && node.type !== 'comment');
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} values */
function getArguments(values) {
  const list = [[]];
  let followsComma = false;
  for (const child of values) {
    if (isTokenNode(child) && isTokenComma(child.value)) {
      list.push([]);
      followsComma = true;
    } else if (followsComma && child.type === 'whitespace') {
      // This whitespace was attached to the legacy parser's comma divider.
    } else {
      list.at(-1).push(child);
      followsComma = false;
    }
  }
  return list;
}

/** @param {Map<object, string>} replacements @param {object} node @param {string} value */
function replace(replacements, node, value) {
  replacements.set(node, value);
}

/**
 * @param {{ number: string, unit: string } | undefined} largestPosition
 * @param {import('@csstools/css-parser-algorithms').ComponentValue} position
 * @param {Map<object, string>} replacements
 */
function updateLargestPosition(largestPosition, position, replacements) {
  if (!isPosition(position)) return undefined;
  const currentPosition = unit(position.value);
  if (!currentPosition) return undefined;
  if (!largestPosition) return currentPosition;
  const isFixedUp = isLessThanOrEqual(largestPosition, currentPosition);
  if (isFixedUp) {
    replace(replacements, position, '0');
    return largestPosition;
  }
  return isFixedUp === undefined ? undefined : currentPosition;
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[][]} args @param {Map<object, string>} replacements */
function optimizeColorStops(args, replacements) {
  const firstStopIndex = args.findIndex(isColorStopArgument);
  if (firstStopIndex === -1) return;

  const stops = [];
  let largestPosition;
  let hasSeenStop = false;
  for (const argument of args.slice(firstStopIndex)) {
    const colorStop = isColorStopArgument(argument);
    const positions = getPositions(argument, colorStop);
    if (colorStop) {
      stops.push({ argument, positions });
      if (!hasSeenStop && positions.length === 0) {
        largestPosition = { number: '0', unit: '%' };
      }
      hasSeenStop = true;
    }
    for (const position of positions) {
      largestPosition = updateLargestPosition(
        largestPosition,
        position,
        replacements
      );
    }
  }

  const firstStop = stops[0];
  const lastStop = stops.at(-1);
  if (
    firstStop &&
    firstStop.positions.length === 1 &&
    firstStop.argument.length === 3 &&
    (replacements.get(firstStop.positions[0]) ??
      firstStop.positions[0].toString()) === '0%'
  ) {
    replace(replacements, firstStop.argument[1], '');
    replace(replacements, firstStop.positions[0], '');
  }
  if (
    lastStop &&
    lastStop.positions.length === 1 &&
    lastStop.argument.length === 3 &&
    (replacements.get(lastStop.positions[0]) ??
      lastStop.positions[0].toString()) === '100%'
  ) {
    replace(replacements, lastStop.argument[1], '');
    replace(replacements, lastStop.positions[0], '');
  }
}

/** @param {import('@csstools/css-parser-algorithms').FunctionNode} node @param {Map<object, string>} replacements */
function optimizeLinearGradient(node, replacements) {
  const args = getArguments(node.value);
  const [first, whitespace, side] = node.value;
  if (
    isTokenNode(first) &&
    isTokenIdent(first.value) &&
    first.toString().toLowerCase() === 'to' &&
    args[0].length === 3 &&
    side
  ) {
    const angle = directionsToAngles.get(side.toString().toLowerCase());
    if (angle) {
      replace(replacements, first, '');
      replace(replacements, whitespace, '');
      replace(replacements, side, angle);
    }
  }
  optimizeColorStops(args, replacements);
}

/** @param {import('@csstools/css-parser-algorithms').FunctionNode} node @param {Map<object, string>} replacements */
function optimizeWebkitRadialGradient(node, replacements) {
  let previousStop;
  for (const argument of getArguments(node.value)) {
    if (argument[2] === undefined) continue;
    const color = argument[0]?.toString().toLowerCase();
    const stop = argument[2].toString().toLowerCase();
    if (!color || !isColorStop(color, stop)) continue;
    const thisStop = isTokenNode(argument[2]) ? unit(argument[2].value) : false;
    if (!previousStop) {
      previousStop = thisStop;
    } else if (thisStop && isLessThan(previousStop, thisStop)) {
      replace(replacements, argument[2], '0');
      previousStop = thisStop;
    } else {
      previousStop = thisStop;
    }
  }
}

/** @param {import('@csstools/css-parser-algorithms').FunctionNode} node @param {Map<object, string>} replacements */
function optimizeGradient(node, replacements) {
  const name = node.getName().toLowerCase();
  if (
    name === 'linear-gradient' ||
    name === 'repeating-linear-gradient' ||
    name === '-webkit-linear-gradient' ||
    name === '-webkit-repeating-linear-gradient'
  ) {
    optimizeLinearGradient(node, replacements);
  } else if (
    name === 'radial-gradient' ||
    name === 'repeating-radial-gradient' ||
    name === 'conic-gradient' ||
    name === 'repeating-conic-gradient'
  ) {
    optimizeColorStops(getArguments(node.value), replacements);
  } else if (
    name === '-webkit-radial-gradient' ||
    name === '-webkit-repeating-radial-gradient'
  ) {
    optimizeWebkitRadialGradient(node, replacements);
  }
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} values @param {Map<object, string>} replacements @param {boolean} [walkGradients] */
function serialize(values, replacements, walkGradients = true) {
  return values
    .map((node) => {
      const replacement = replacements.get(node);
      if (replacement !== undefined) return replacement;
      if (!isFunctionNode(node) && !isSimpleBlockNode(node)) {
        return node.toString();
      }

      const source = node.toString();
      const original = node.value.map((child) => child.toString()).join('');
      if (isFunctionNode(node) && walkGradients) {
        optimizeGradient(node, replacements);
      }
      const content = serialize(node.value, replacements, false);
      return source.replace(original, content);
    })
    .join('');
}

function optimize(value) {
  const normalizedValue = value.toLowerCase();
  if (
    normalizedValue.includes('var(') ||
    normalizedValue.includes('env(') ||
    !normalizedValue.includes('gradient')
  ) {
    return value;
  }
  const values = parseListOfComponentValues(tokenize({ css: value }));
  return serialize(values, new Map());
}

/** @return {import('postcss').Plugin} */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-minify-gradients',
    /** @param {import('postcss').Root} css */
    OnceExit(css) {
      css.walkDecls((decl) => {
        if (decl.value) decl.value = optimize(decl.value);
      });
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
