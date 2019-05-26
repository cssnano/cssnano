import { list } from 'postcss';
import { unit } from 'postcss-value-parser';
import { detect } from 'lerna:stylehacks';
import * as R from 'ramda';
import canMerge from '../canMerge';
import getValue from '../getValue';
import mergeRules from '../mergeRules';
import insertCloned from '../insertCloned';
import remove from '../remove';
import canExplode from '../canExplode';
import cleanupRule from '../cleanupRule';
import lowercaseEq from '../lowercaseEq';

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

const isAuto = lowercaseEq(auto);
const isInherit = lowercaseEq(inherit);
const otherwise = R.T;

const normalize = R.cond([
  [R.all(isAuto), R.last],
  [
    R.any(isAuto),
    R.compose(
      R.last,
      R.reject(isAuto)
    ),
  ],
  [R.any(isInherit), () => inherit],
  [otherwise, R.join(' ')],
]);

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

      if (isAuto(value)) {
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

const cleanup = cleanupRule(properties, 'columns');

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
