'use strict';
const stylehacks = require('stylehacks');
const canMerge = require('../canMerge.js');
const getDecls = require('../getDecls.js');
const minifyTrbl = require('../minifyTrbl.js');
const parseTrbl = require('../parseTrbl.js');
const insertCloned = require('../insertCloned.js');
const mergeRules = require('../mergeRules.js');
const mergeValues = require('../mergeValues.js');
const topRightBottomLeft = require('../trbl.js');
const isCustomProp = require('../isCustomProp.js');
const canExplode = require('../canExplode.js');

/**
 * @param {string} prop A CSS property name
 * @return {{explode: (rule: import('postcss').Rule) => void, merge: (rule: import('postcss').Rule) => void}}
 */
module.exports = (prop) => {
  const physicalBoxProperties = topRightBottomLeft.map(
    (direction) => `${prop}-${direction}`
  );
  /** @type {(rule: import('postcss').Rule) => void} */
  const cleanup = (rule) => {
    let boxPropertyDeclarations = getDecls(
      rule,
      new Set([prop].concat(physicalBoxProperties))
    );

    while (boxPropertyDeclarations.length) {
      const lastNode =
        boxPropertyDeclarations[boxPropertyDeclarations.length - 1];

      // remove properties of lower precedence
      const lesser = boxPropertyDeclarations.filter(
        (node) =>
          !stylehacks.detect(lastNode) &&
          !stylehacks.detect(node) &&
          node !== lastNode &&
          node.important === lastNode.important &&
          lastNode.prop === prop &&
          node.prop !== lastNode.prop
      );

      for (const node of lesser) {
        node.remove();
      }
      boxPropertyDeclarations = boxPropertyDeclarations.filter(
        (node) => !lesser.includes(node)
      );

      // get duplicate properties
      const duplicates = boxPropertyDeclarations.filter(
        (node) =>
          !stylehacks.detect(lastNode) &&
          !stylehacks.detect(node) &&
          node !== lastNode &&
          node.important === lastNode.important &&
          node.prop === lastNode.prop &&
          !(!isCustomProp(node) && isCustomProp(lastNode))
      );

      for (const node of duplicates) {
        node.remove();
      }
      boxPropertyDeclarations = boxPropertyDeclarations.filter(
        (node) => node !== lastNode && !duplicates.includes(node)
      );
    }
  };

  return {
    /** @type {(rule: import('postcss').Rule) => void} */
    explode: (rule) => {
      rule.walkDecls(new RegExp('^' + prop + '$', 'i'), (decl) => {
        if (!canExplode(decl)) {
          return;
        }

        if (stylehacks.detect(decl)) {
          return;
        }

        const values = parseTrbl(decl.value);

        for (const index of topRightBottomLeft.keys()) {
          insertCloned(
            /** @type {import('postcss').Rule} */ (decl.parent),
            decl,
            {
              prop: physicalBoxProperties[index],
              value: values[index],
            }
          );
        }

        decl.remove();
      });
    },
    /** @type {(rule: import('postcss').Rule) => void} */
    merge: (rule) => {
      mergeRules(rule, physicalBoxProperties, (rules, lastNode) => {
        if (canMerge(rules) && !rules.some(stylehacks.detect)) {
          insertCloned(
            /** @type {import('postcss').Rule} */ (lastNode.parent),
            lastNode,
            {
              prop,
              value: minifyTrbl(mergeValues(...rules)),
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
    },
  };
};
