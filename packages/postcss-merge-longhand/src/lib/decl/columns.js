'use strict';
const { list } = require('postcss');
const valueParser = require('postcss-value-parser');
const stylehacks = require('stylehacks');
const canMerge = require('../canMerge.js');
const getDecls = require('../getDecls.js');
const getValue = require('../getValue.js');
const mergeRules = require('../mergeRules.js');
const insertCloned = require('../insertCloned.js');
const { isFallback } = require('../isFallback.js');
const canExplode = require('../canExplode.js');
const lastOf = require('../lastOf.js');
const { shorthand, initialValues } = require('../spec.js');

const columns = 'columns';
/* The properties the shorthand sets */
const columnProperties = ['column-width', 'column-count'];
/* Column properties the shorthand does not set */
const otherColumnProperties = shorthand(columns).longhands.filter(
  (property) => !columnProperties.includes(property)
);
const auto = /** @type {string} */ (initialValues.get(columnProperties[0]));
const inherit = 'inherit';
/* A unit is a bare identifier, so `30em/10em` is not a length. */
const lengthUnitRegex = /^[a-z]+$/i;

/**
 * Normalize a columns shorthand definition. Both of the longhand
 * properties' initial values are 'auto', and as per the spec,
 * omitted values are set to their initial values. Thus, we can
 * remove any 'auto' definition when there are two values.
 *
 * Specification link: https://www.w3.org/TR/css3-multicol/
 *
 * @param {[string, string]} values
 * @return {string}
 */
function normalize(values) {
  if (values[0].toLowerCase() === auto) {
    return values[1];
  }

  if (values[1].toLowerCase() === auto) {
    return values[0];
  }

  if (
    values[0].toLowerCase() === inherit &&
    values[1].toLowerCase() === inherit
  ) {
    return inherit;
  }

  return values.join(' ');
}
/**
 * The component a value can only have come from: `column-width` takes a
 * length, `column-count` an integer, and `auto` fits either.
 *
 * @param {string} value
 * @return {'width' | 'count' | 'initial' | undefined} undefined for anything
 * else, since a value this cannot classify, `calc()` among them, could be
 * either.
 */
function componentRole(value) {
  if (value.toLowerCase() === auto) {
    return 'initial';
  }

  const dimension = valueParser.unit(value);

  if (!dimension) {
    return undefined;
  }

  if (dimension.unit === '') {
    return /^\d+$/.test(dimension.number) ? 'count' : undefined;
  }

  return lengthUnitRegex.test(dimension.unit) ? 'width' : undefined;
}

/**
 * Takes the shorthand apart into the values it gives `column-width` and
 * `column-count`, filling in the initial value for a component it leaves out.
 * The two are combined with `||`, so they may appear in either order.
 *
 * https://drafts.csswg.org/css-multicol-2/#columns
 *
 * @param {string} value
 * @return {[string, string] | undefined} undefined when the value is not a form
 * that can be taken apart without guessing which component a value belongs to.
 */
function parseColumns(value) {
  const values = list.space(value);

  if (values.length > columnProperties.length) {
    return undefined;
  }

  /** @type {(string | undefined)[]} */
  const parsed = [undefined, undefined];
  /** @type {string[]} */
  const ambiguous = [];

  for (const component of values) {
    const role = componentRole(component);

    if (role === undefined) {
      return undefined;
    }

    if (role === 'initial') {
      ambiguous.push(component);
      continue;
    }

    const index = role === 'width' ? 0 : 1;

    if (parsed[index] !== undefined) {
      return undefined;
    }

    parsed[index] = component;
  }

  /* `auto` names whichever component the rest of the value does not. */
  for (const component of ambiguous) {
    const free = parsed.indexOf(undefined);

    if (free === -1) {
      return undefined;
    }

    parsed[free] = component;
  }

  return /** @type {[string, string]} */ (
    parsed.map((component) => component ?? auto)
  );
}

/**
 * Check if a declaration sets column properties beyond `column-width` and
 * `column-count`. The `columns: <width> / <height>` form sets others (like
 * `column-height`), so we detect the slash. Only top-level slashes separate
 * components; ones in functions like `calc(100%/3)` do not.
 *
 * @param {import('postcss').Declaration} declaration
 * @return {boolean}
 */
function setsOtherColumnProperty(declaration) {
  const prop = declaration.prop.toLowerCase();

  if (otherColumnProperties.includes(prop)) {
    return true;
  }

  return (
    prop === columns &&
    valueParser(declaration.value).nodes.some(
      (node) => node.type === 'div' && node.value === '/'
    )
  );
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function explode(rule) {
  rule.walkDecls((decl) => {
    if (decl.prop.toLowerCase() !== columns) {
      return;
    }

    if (!canExplode(decl)) {
      return;
    }

    if (stylehacks.detect(decl)) {
      return;
    }

    const values = parseColumns(decl.value);

    if (!values) {
      return;
    }

    for (const [i, value] of values.entries()) {
      insertCloned(/** @type {import('postcss').Rule} */ (decl.parent), decl, {
        prop: columnProperties[i],
        value,
      });
    }

    decl.remove();
  });
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function cleanup(rule) {
  const decls = getDecls(rule, new Set([columns].concat(columnProperties)));

  while (decls.size) {
    const lastNode = lastOf(decls);

    // remove properties of lower precedence
    const lesser = [];
    for (const node of decls) {
      if (
        !stylehacks.detect(lastNode) &&
        !stylehacks.detect(node) &&
        node !== lastNode &&
        node.important === lastNode.important &&
        lastNode.prop === columns &&
        node.prop !== lastNode.prop &&
        !isFallback(node, lastNode)
      ) {
        lesser.push(node);
      }
    }

    for (const node of lesser) {
      node.remove();
      decls.delete(node);
    }

    // get duplicate properties
    const duplicates = [];
    for (const node of decls) {
      if (
        !stylehacks.detect(lastNode) &&
        !stylehacks.detect(node) &&
        node !== lastNode &&
        node.important === lastNode.important &&
        node.prop === lastNode.prop &&
        !isFallback(node, lastNode)
      ) {
        duplicates.push(node);
      }
    }

    for (const node of duplicates) {
      node.remove();
      decls.delete(node);
    }

    decls.delete(lastNode);
  }
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function merge(rule) {
  mergeRules(rule, columnProperties, (rules, lastNode) => {
    if (canMerge(rules) && !rules.some(stylehacks.detect)) {
      insertCloned(
        /** @type {import('postcss').Rule} */ (lastNode.parent),
        lastNode,
        {
          prop: columns,
          value: normalize(/** @type [string, string] */ (rules.map(getValue))),
        }
      );

      for (const node of rules) {
        node.remove();
      }

      return true;
    }
    return false;
  });

  cleanup(rule);
}

module.exports = {
  explode,
  merge,
  setsOtherColumnProperty,
};
