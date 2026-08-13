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
const { isFallback } = require('../isFallback.js');
const canExplode = require('../canExplode.js');
const lastOf = require('../lastOf.js');

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
    const boxPropertyDeclarations = getDecls(
      rule,
      new Set([prop].concat(physicalBoxProperties))
    );

    while (boxPropertyDeclarations.size) {
      const lastNode = lastOf(boxPropertyDeclarations);

      // remove properties of lower precedence
      const lesser = [];
      for (const node of boxPropertyDeclarations) {
        if (
          !stylehacks.detect(lastNode) &&
          !stylehacks.detect(node) &&
          node !== lastNode &&
          node.important === lastNode.important &&
          lastNode.prop === prop &&
          node.prop !== lastNode.prop &&
          !isFallback(node, lastNode)
        ) {
          lesser.push(node);
        }
      }

      for (const node of lesser) {
        node.remove();
        boxPropertyDeclarations.delete(node);
      }

      // get duplicate properties
      const duplicates = new Set();
      for (const node of boxPropertyDeclarations) {
        if (
          !stylehacks.detect(lastNode) &&
          !stylehacks.detect(node) &&
          node !== lastNode &&
          node.important === lastNode.important &&
          node.prop === lastNode.prop &&
          !isFallback(node, lastNode)
        ) {
          duplicates.add(node);
        }
      }

      for (const node of duplicates) {
        node.remove();
        boxPropertyDeclarations.delete(node);
      }

      boxPropertyDeclarations.delete(lastNode);
    }
  };

  return {
    /** @type {(rule: import('postcss').Rule) => void} */
    explode: (rule) => {
      rule.walkDecls((decl) => {
        if (decl.prop.toLowerCase() !== prop) {
          return;
        }

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
