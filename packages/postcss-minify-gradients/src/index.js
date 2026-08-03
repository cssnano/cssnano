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
 * Returns whether b is less than a.
 *
 * @param {valueParser.Dimension} a
 * @param {valueParser.Dimension} b
 * @returns {boolean}
 */
function isLessThan(a, b) {
  return (
    a.unit.toLowerCase() === b.unit.toLowerCase() &&
    parseFloat(a.number) >= parseFloat(b.number)
  );
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
  if (node.nodes[0].value.toLowerCase() === 'to' && args[0].length === 3) {
    shortenDirection(node);
  }
  /** @type {valueParser.Dimension | false | undefined} */
  let previousStop = undefined;

  for (const [index, arg] of args.entries()) {
    /* Check whether the stop contains a position */
    if (arg.length !== 3) {
      continue;
    }

    const isFinalStop = index === args.length - 1;
    const thisStop = valueParser.unit(arg[2].value);

    if (previousStop === undefined) {
      previousStop = thisStop;

      if (
        !isFinalStop &&
        previousStop &&
        args.length < 4 &&
        previousStop.number === '0' &&
        previousStop.unit.toLowerCase() !== 'deg'
      ) {
        arg[1].value = arg[2].value = '';
      }

      continue;
    }

    if (previousStop && thisStop && isLessThan(previousStop, thisStop)) {
      arg[2].value = '0';
    }

    previousStop = thisStop;

    if (isFinalStop && arg[2].value === '100%') {
      arg[1].value = arg[2].value = '';
    }
  }

  return false;
}

/**
 * Optimises a radial gradient.
 *
 * @param {import('postcss-value-parser').ParsedValue | import('postcss-value-parser').FunctionNode} node
 * @returns {false}
 */
function optimizeRadialGradient(node) {
  const args = getArguments(node);
  /** @type {valueParser.Dimension | false | undefined} */
  let previousStop = undefined;

  const hasAt = args[0].find((n) => n.value.toLowerCase() === 'at');

  for (const [index, arg] of args.entries()) {
    if (!arg[2] || (!index && hasAt)) {
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
