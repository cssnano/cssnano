'use strict';
const valueParser = require('postcss-value-parser');
const { getArguments } = require('cssnano-utils');
const isColorStop = require('./isColorStop.js');

const directionsToAngles = new Map([
  ['top', '0deg'],
  ['right', '90deg'],
  ['bottom', '180deg'],
  ['left', '270deg'],
]);

/**
 * Returns whether b is less than or equal to a.
 *
 * @param {valueParser.Dimension} a
 * @param {valueParser.Dimension} b
 * @returns {boolean}
 */
function isLessThan(a, b) {
  return (
    a.unit.toLowerCase() === b.unit.toLowerCase() &&
    Number.parseFloat(a.number) >= Number.parseFloat(b.number)
  );
}

/**
 * Compares positions when their ordering is independent of layout.
 *
 * @param {valueParser.Dimension} a
 * @param {valueParser.Dimension} b
 * @returns {boolean | undefined}
 */
function isLessThanOrEqual(a, b) {
  if (a.unit.toLowerCase() === b.unit.toLowerCase()) {
    return isLessThan(a, b);
  }

  const aNumber = Number.parseFloat(a.number);
  const bNumber = Number.parseFloat(b.number);

  if (aNumber === 0) {
    return bNumber <= 0;
  }

  if (bNumber === 0) {
    return aNumber >= 0;
  }
}

/**
 * Returns whether a node is a literal color stop position.
 *
 * @param {import('postcss-value-parser').Node} node
 * @returns {boolean}
 */
function isPosition(node) {
  return node.type === 'word' && valueParser.unit(node.value) !== false;
}

/**
 * Returns whether an argument begins a color stop.
 *
 * @param {import('postcss-value-parser').Node[]} argument
 * @returns {boolean}
 */
function isColorStopArgument(argument) {
  const first = argument[0];

  if (!first) {
    return false;
  }

  if (first.type === 'function') {
    return !new Set(['calc', 'clamp', 'max', 'min']).has(
      first.value.toLowerCase()
    );
  }

  return first.type === 'word' && isColorStop(first.value);
}

/**
 * Gets the position nodes from a color stop or transition hint.
 *
 * @param {import('postcss-value-parser').Node[]} argument
 * @param {boolean} colorStopArgument
 * @returns {import('postcss-value-parser').Node[]}
 */
function getPositions(argument, colorStopArgument) {
  return argument.slice(colorStopArgument ? 1 : 0).filter((node) => {
    return node.type !== 'space' && node.type !== 'comment';
  });
}

/**
 * Updates the largest preceding position, replacing a position that will be
 * fixed up with its shorter equivalent.
 *
 * @param {valueParser.Dimension | undefined} largestPosition
 * @param {import('postcss-value-parser').Node} position
 * @returns {valueParser.Dimension | undefined}
 */
function updateLargestPosition(largestPosition, position) {
  if (!isPosition(position)) {
    return undefined;
  }

  const currentPosition = valueParser.unit(position.value);

  if (!currentPosition) {
    return undefined;
  }

  if (!largestPosition) {
    return currentPosition;
  }

  const isFixedUp = isLessThanOrEqual(largestPosition, currentPosition);

  if (isFixedUp) {
    position.value = '0';
    return largestPosition;
  }

  return isFixedUp === undefined ? undefined : currentPosition;
}

/**
 * Optimizes a standard gradient color stop list using the color stop fixup
 * algorithm. A non-literal position prevents later comparisons because its
 * used value can only be known during layout.
 *
 * @param {import('postcss-value-parser').Node[][]} args
 * @returns {void}
 */
function optimizeColorStops(args) {
  const firstStopIndex = args.findIndex(isColorStopArgument);

  if (firstStopIndex === -1) {
    return;
  }

  const stops = [];
  let largestPosition = /** @type {valueParser.Dimension | undefined} */ (
    undefined
  );
  let hasSeenStop = false;

  for (const argument of args.slice(firstStopIndex)) {
    const colorStop = isColorStopArgument(argument);
    const positions = getPositions(argument, colorStop);

    if (colorStop) {
      stops.push({ argument, positions });

      if (!hasSeenStop && positions.length === 0) {
        largestPosition = /** @type {valueParser.Dimension} */ (
          valueParser.unit('0%')
        );
      }

      hasSeenStop = true;
    }

    if (positions.length === 0) {
      continue;
    }

    for (const position of positions) {
      largestPosition = updateLargestPosition(largestPosition, position);
    }
  }

  const firstStop = stops[0];
  const lastStop = stops.at(-1);

  if (
    firstStop &&
    firstStop.positions.length === 1 &&
    firstStop.argument.length === 3 &&
    firstStop.positions[0].value === '0%'
  ) {
    firstStop.argument[1].value = firstStop.positions[0].value = '';
  }

  if (
    lastStop &&
    lastStop.positions.length === 1 &&
    lastStop.argument.length === 3 &&
    lastStop.positions[0].value === '100%'
  ) {
    lastStop.argument[1].value = lastStop.positions[0].value = '';
  }
}

/**
 * Shortens a direction like `to left top` into an angle.
 *
 * @param {import('postcss-value-parser').FunctionNode} node
 * @returns {void}
 */
function shortenDirection(node) {
  node.nodes = node.nodes.slice(2);
  node.nodes[0].value = /** @type {string} */ (
    directionsToAngles.get(node.nodes[0].value.toLowerCase())
  );
}

/**
 * Optimises a linear gradient.
 *
 * @param {import('postcss-value-parser').FunctionNode} node
 * @returns {false}
 */
function optimizeLinearGradient(node) {
  const args = getArguments(node);
  if (node.nodes[0]?.value.toLowerCase() === 'to' && args[0].length === 3) {
    shortenDirection(node);
  }
  optimizeColorStops(getArguments(node));

  return false;
}

/**
 * Optimises a radial gradient.
 *
 * @param {import('postcss-value-parser').ParsedValue | import('postcss-value-parser').FunctionNode} node
 * @returns {false}
 */
function optimizeRadialGradient(node) {
  optimizeColorStops(getArguments(node));

  return false;
}

/**
 * Optimises a radial gradient.
 *
 * @param {import('postcss-value-parser').ParsedValue | import('postcss-value-parser').FunctionNode} node
 * @returns {false}
 */
function optimizeWebkitRadialGradient(node) {
  const args = getArguments(node);
  /** @type {valueParser.Dimension | false | undefined} */
  let previousStop = undefined;

  for (const arg of args) {
    let color;
    let stop;

    if (arg[2] !== undefined) {
      if (arg[0].type === 'function') {
        color = `${arg[0].value}(${valueParser.stringify(arg[0].nodes)})`;
      } else {
        color = arg[0].value;
      }

      if (arg[2].type === 'function') {
        stop = `${arg[2].value}(${valueParser.stringify(arg[2].nodes)})`;
      } else {
        stop = arg[2].value;
      }
    } else {
      if (arg[0].type === 'function') {
        // eslint-disable-next-line no-useless-assignment
        color = `${arg[0].value}(${valueParser.stringify(arg[0].nodes)})`;
      }

      color = arg[0].value;
    }

    color = color.toLowerCase();

    const colorStop =
      stop !== undefined
        ? isColorStop(color, stop.toLowerCase())
        : isColorStop(color);

    if (!colorStop || !arg[2]) {
      continue;
    }

    const thisStop = valueParser.unit(arg[2].value);

    if (!previousStop) {
      previousStop = thisStop;

      continue;
    }

    if (previousStop && thisStop && isLessThan(previousStop, thisStop)) {
      arg[2].value = '0';
    }

    previousStop = thisStop;
  }

  return false;
}

/**
 * @param {import('postcss').Declaration} decl
 * @return {void}
 */
function optimise(decl) {
  const value = decl.value;

  if (!value) {
    return;
  }

  const normalizedValue = value.toLowerCase();

  if (normalizedValue.includes('var(') || normalizedValue.includes('env(')) {
    return;
  }

  if (!normalizedValue.includes('gradient')) {
    return;
  }

  decl.value = valueParser(value)
    .walk((node) => {
      if (node.type !== 'function' || !node.nodes.length) {
        return false;
      }

      const lowerCasedValue = node.value.toLowerCase();

      if (
        lowerCasedValue === 'linear-gradient' ||
        lowerCasedValue === 'repeating-linear-gradient' ||
        lowerCasedValue === '-webkit-linear-gradient' ||
        lowerCasedValue === '-webkit-repeating-linear-gradient'
      ) {
        return optimizeLinearGradient(node);
      }

      if (
        lowerCasedValue === 'radial-gradient' ||
        lowerCasedValue === 'repeating-radial-gradient'
      ) {
        return optimizeRadialGradient(node);
      }

      if (
        lowerCasedValue === '-webkit-radial-gradient' ||
        lowerCasedValue === '-webkit-repeating-radial-gradient'
      ) {
        return optimizeWebkitRadialGradient(node);
      }

      if (
        lowerCasedValue === 'conic-gradient' ||
        lowerCasedValue === 'repeating-conic-gradient'
      ) {
        optimizeColorStops(getArguments(node));
      }
      return false;
    })
    .toString();
}
/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-minify-gradients',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      css.walkDecls(optimise);
    },
  };
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<void>}*/ (
  pluginCreator
);
