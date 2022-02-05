'use strict';
const { list } = require('postcss');
const { unit } = require('postcss-value-parser');
const stylehacks = require('stylehacks');
const canMerge = require('../canMerge');
const getDecls = require('../getDecls');
const getValue = require('../getValue');
const mergeRules = require('../mergeRules');
const insertCloned = require('../insertCloned');
const remove = require('../remove');
const isCustomProp = require('../isCustomProp');
const canExplode = require('../canExplode');

const properties = ['column-width', 'column-count'];
const auto = 'auto';
const inherit = 'inherit';

/**
 * Normalize a columns shorthand definition. Both of the longhand
 * properties' initial values are 'auto', and as per the spec,
 * omitted values are set to their initial values. Thus, we can
 * remove any 'auto' definition when there are two values.
 *
 * Specification link: https://www.w3.org/TR/css3-multicol/
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

function explode(rule) {
  rule.walkDecls(/^columns$/i, (decl) => {
    if (!canExplode(decl)) {
      return;
    }

    if (stylehacks.detect(decl)) {
      return;
    }

    let values = list.space(decl.value);

    if (values.length === 1) {
      values.push(auto);
    }

    values.forEach((value, i) => {
      let prop = properties[1];
      const dimension = unit(value);
      if (value.toLowerCase() === auto) {
        prop = properties[i];
      } else if (dimension && dimension.unit !== '') {
        prop = properties[0];
      }

      insertCloned(decl.parent, decl, {
        prop,
        value,
      });
    });

    decl.remove();
  });
}

function cleanup(rule) {
  let decls = getDecls(rule, ['columns'].concat(properties));

  while (decls.length) {
    const lastNode = decls[decls.length - 1];

    // remove properties of lower precedence
    const lesser = decls.filter(
      (node) =>
        !stylehacks.detect(lastNode) &&
        !stylehacks.detect(node) &&
        node !== lastNode &&
        node.important === lastNode.important &&
        lastNode.prop === 'columns' &&
        node.prop !== lastNode.prop
    );

    lesser.forEach(remove);
    decls = decls.filter((node) => !lesser.includes(node));

    // get duplicate properties
    let duplicates = decls.filter(
      (node) =>
        !stylehacks.detect(lastNode) &&
        !stylehacks.detect(node) &&
        node !== lastNode &&
        node.important === lastNode.important &&
        node.prop === lastNode.prop &&
        !(!isCustomProp(node) && isCustomProp(lastNode))
    );

    duplicates.forEach(remove);
    decls = decls.filter(
      (node) => node !== lastNode && !duplicates.includes(node)
    );
  }
}

function merge(rule) {
  mergeRules(rule, properties, (rules, lastNode) => {
    if (canMerge(rules) && !rules.some(stylehacks.detect)) {
      insertCloned(lastNode.parent, lastNode, {
        prop: 'columns',
        value: normalize(rules.map(getValue)),
      });

      rules.forEach(remove);

      return true;
    }
  });

  cleanup(rule);
}

module.exports = {
  explode,
  merge,
};
