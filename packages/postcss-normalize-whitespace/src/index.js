'use strict';
const valueParser = require('postcss-value-parser');

const atrule = 'atrule';
const decl = 'decl';
const rule = 'rule';
const variableFunctions = new Set(['var', 'env', 'constant']);
const ieHackRegex = /\s*(\\9)\s*/;
const whitespaceRegex = /\s/g;

/**
 * Reports whether a value ends in a backslash that begins an escape
 * sequence, as opposed to a backslash that is itself escaped by a
 * preceding backslash.
 * @param {string} value
 * @return {boolean}
 */
function endsWithEscapingBackslash(value) {
  let backslashes = 0;

  for (let i = value.length - 1; i >= 0 && value[i] === '\\'; i--) {
    backslashes++;
  }

  return backslashes % 2 === 1;
}

/**
 * @param {valueParser.Node} node
 * @return {void}
 */
function reduceCalcWhitespaces(node) {
  if (node.type === 'space') {
    node.value = ' ';
  } else if (node.type === 'function') {
    if (!variableFunctions.has(node.value.toLowerCase())) {
      node.before = node.after = '';
    }
  }
}
/**
 * @param {valueParser.Node} node
 * @return {void | false}
 */
function reduceWhitespaces(node) {
  if (node.type === 'space') {
    node.value = ' ';
  } else if (node.type === 'div') {
    node.before = node.after = '';
  } else if (node.type === 'function') {
    if (!variableFunctions.has(node.value.toLowerCase())) {
      node.before = node.after = '';
    }
    if (node.value.toLowerCase() === 'calc') {
      valueParser.walk(node.nodes, reduceCalcWhitespaces);
      return false;
    }
  }
}

/**
 *
 * @param {import('postcss').Declaration} node
 * @param {Map<string, string>} cache
 * @return {void}
 */
function trimDeclaration(node, cache) {
  // Ensure that !important values do not have any excess whitespace
  if (node.important) {
    node.raws.important = '!important';
  }
  // Remove whitespaces around ie 9 hack
  node.value = node.value.replace(ieHackRegex, '$1');
  const value = node.value;

  if (cache.has(value)) {
    node.value = /** @type {string} **/ (cache.get(value));
  } else {
    const parsed = valueParser(node.value);
    const result = parsed.walk(reduceWhitespaces).toString();

    // Trim whitespace inside functions & dividers
    node.value = result;
    cache.set(value, result);
  }

  // Remove extra semicolons and whitespace before the declaration
  if (node.raws.before) {
    const prev = node.prev();

    if (prev && prev.type !== rule) {
      node.raws.before = node.raws.before.replace(/;/g, '');
    }
  }

  node.raws.between = ':';
  node.raws.semicolon = false;
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-whitespace',

    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const declarationCache = new Map();

      css.walk((node) => {
        const { type } = node;

        if ([decl, rule, atrule].includes(type) && node.raws.before) {
          node.raws.before = node.raws.before.replace(whitespaceRegex, '');
        }

        if (type === decl && !node.prop.startsWith('--')) {
          trimDeclaration(node, declarationCache);
        } else if (type === rule || type === atrule) {
          // When the last declaration has no trailing semicolon and its
          // value ends in an escape sequence consuming whitespace (e.g.
          // `\9` written as `\` followed by a literal tab), the parser
          // attributes the escaped code point to the rule's trailing
          // raw instead of the declaration's value. Reattach the single
          // character the backslash escapes before discarding the rest
          // of that raw, or the escape is left dangling and becomes a
          // valid escape of whatever follows it in the output (`}`, or
          // even a `;` inserted as a terminator, since only a newline or
          // end of input is not a valid escape target).
          const last = node.last;

          if (
            last &&
            last.type === decl &&
            endsWithEscapingBackslash(last.value) &&
            node.raws.after
          ) {
            last.value += node.raws.after[0];
          }

          node.raws.between = node.raws.after = '';
          node.raws.semicolon = false;
        }
      });

      // Remove final newline
      css.raws.after = '';
    },
  };
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<void>}*/ (
  pluginCreator
);
