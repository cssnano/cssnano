import stylehacks from 'stylehacks';
import canMerge from '../canMerge.js';
import getDecls from '../getDecls.js';
import minifyTrbl from '../minifyTrbl.js';
import parseTrbl from '../parseTrbl.js';
import insertCloned from '../insertCloned.js';
import mergeRules from '../mergeRules.js';
import mergeValues from '../mergeValues.js';
import topRightBottomLeft from '../trbl.js';
import { isFallback } from '../isFallback.js';
import canExplode from '../canExplode.js';
import lastOf from '../lastOf.js';
import { browserKeeps } from '../validateBox.js';
import cssGlobalKeywords from '../cssGlobalKeywords.js';

/** @param {string} prop */
export default (prop) => {
  const physicalBoxProperties = topRightBottomLeft.map(
    (direction) => `${prop}-${direction}`
  );
  const familyProperties = new Set([prop, ...physicalBoxProperties]);

  /**
   * User agents ignore invalid declarations, which corrupts surrounding ones, so
   * we refuse the whole rule rather than check transform by transform, to
   * prevent the same bug in explode, merge, and cleanup.
   *
   * @param {import('postcss').Rule} rule
   * @return {boolean}
   */
  const containsUnmergeableDecls = (rule) =>
    rule.nodes.some((node) => {
      const { type } = node;

      if (type !== 'decl') {
        return false;
      }

      const name = node.prop.toLowerCase();

      if (!familyProperties.has(name)) {
        return false;
      }

      /* A CSS-wide keyword is kept, and specifies nothing about the sides that
       * the transforms could take apart; `canExplode` already rejects them.
       *
       * A stylehack is invalid on purpose — that is how it reaches the one
       * browser it targets — so the grammar has nothing to say about it, and
       * every transform below already leaves it alone. */
      return (
        !cssGlobalKeywords.has(node.value.toLowerCase()) &&
        !stylehacks.detect(node) &&
        !browserKeeps(name, node.value)
      );
    });

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
      if (containsUnmergeableDecls(rule)) {
        return;
      }

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
      if (containsUnmergeableDecls(rule)) {
        return;
      }

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
