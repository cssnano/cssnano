import * as R from 'ramda';
import { plugin } from 'postcss';
import valueParser from 'postcss-value-parser';
import sameParent from 'lerna:cssnano-util-same-parent';

const isAtRuleNode = R.propEq('type', 'atrule');

const isDeclNode = R.propEq('type', 'decl');

const isWordNode = R.propEq('type', 'word');

function canonical(obj) {
  // Prevent potential infinite loops
  let stack = 50;

  return function recurse(key) {
    if (R.has(key, obj) && obj[key] !== key && stack) {
      stack--;

      return recurse(obj[key]);
    }

    stack = 50;

    return key;
  };
}

function mergeAtRules(css, pairs) {
  pairs.forEach((pair) => {
    pair.cache = [];
    pair.replacements = [];
    pair.decls = [];
    pair.removals = [];
  });

  let relevant;

  css.walk((node) => {
    if (isAtRuleNode(node)) {
      relevant = pairs.find((pair) =>
        pair.atrule.test(node.name.toLowerCase())
      );

      if (!relevant) {
        return;
      }

      if (relevant.cache.length < 1) {
        relevant.cache.push(node);
        return;
      } else {
        let toString = node.nodes.toString();

        relevant.cache.forEach((cached) => {
          if (
            cached.name.toLowerCase() === node.name.toLowerCase() &&
            sameParent(cached, node) &&
            cached.nodes.toString() === toString
          ) {
            relevant.removals.push(cached);
            relevant.replacements[cached.params] = node.params;
          }
        });

        relevant.cache.push(node);

        return;
      }
    }

    if (isDeclNode(node)) {
      relevant = pairs.find((pair) => pair.decl.test(node.prop.toLowerCase()));

      if (!relevant) {
        return;
      }

      relevant.decls.push(node);
    }
  });

  pairs.forEach((pair) => {
    let canon = canonical(pair.replacements);

    pair.decls.forEach((decl) => {
      decl.value = valueParser(decl.value)
        .walk((node) => {
          if (isWordNode(node)) {
            node.value = canon(node.value);
          }
        })
        .toString();
    });
    pair.removals.forEach((cached) => cached.remove());
  });
}

export default plugin('postcss-merge-idents', () => {
  return (css) => {
    mergeAtRules(css, [
      {
        atrule: /keyframes/i,
        decl: /animation/i,
      },
      {
        atrule: /counter-style/i,
        decl: /(list-style|system)/i,
      },
    ]);
  };
});
