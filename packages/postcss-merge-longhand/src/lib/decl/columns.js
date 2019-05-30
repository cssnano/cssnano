import { list } from 'postcss';
import { unit } from 'postcss-value-parser';
import { detect } from 'lerna:stylehacks';
import canMerge from '../canMerge';
import getDecls from '../getDecls';
import getValue from '../getValue';
import mergeRules from '../mergeRules';
import insertCloned from '../insertCloned';
import remove from '../remove';
import isCustomProp from '../isCustomProp';
import canExplode from '../canExplode';

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

    if (detect(decl)) {
      return;
    }

    let values = list.space(decl.value);

    if (values.length === 1) {
      values.push(auto);
    }

    values.forEach((value, i) => {
      let prop = properties[1];

      if (value.toLowerCase() === auto) {
        prop = properties[i];
      } else if (unit(value).unit) {
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
        !detect(lastNode) &&
        !detect(node) &&
        node !== lastNode &&
        node.important === lastNode.important &&
        lastNode.prop === 'columns' &&
        node.prop !== lastNode.prop
    );

    lesser.forEach(remove);
    decls = decls.filter((node) => !~lesser.indexOf(node));

    // get duplicate properties
    let duplicates = decls.filter(
      (node) =>
        !detect(lastNode) &&
        !detect(node) &&
        node !== lastNode &&
        node.important === lastNode.important &&
        node.prop === lastNode.prop &&
        !isCustomProp(node) &&
        !isCustomProp(lastNode)
    );

    duplicates.forEach(remove);
    decls = decls.filter(
      (node) => node !== lastNode && !~duplicates.indexOf(node)
    );
  }
}

function merge(rule) {
  mergeRules(rule, properties, (rules, lastNode) => {
    if (canMerge(rules) && !rules.some(detect)) {
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

export default {
  explode,
  merge,
};
