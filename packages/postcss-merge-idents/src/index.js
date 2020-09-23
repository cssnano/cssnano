import has from 'has';
import valueParser from 'postcss-value-parser';
import { sameParent } from 'lerna:cssnano-utils';

const postcssPlugin = 'postcss-merge-idents';

function canonical(obj) {
  // Prevent potential infinite loops
  let stack = 50;

  return function recurse(key) {
    if (has(obj, key) && obj[key] !== key && stack) {
      stack--;

      return recurse(obj[key]);
    }

    stack = 50;

    return key;
  };
}

export default () => {
  let pairs = [
    {
      atrule: /keyframes/i,
      decl: /animation/i,
    },
    {
      atrule: /counter-style/i,
      decl: /(list-style|system)/i,
    },
  ];
  pairs.forEach((pair) => {
    pair.cache = [];
    pair.replacements = [];
    pair.decls = [];
    pair.removals = [];
  });

  let relevant;
  return {
    postcssPlugin,
    AtRule(node) {
      relevant = pairs.filter((pair) =>
        pair.atrule.test(node.name.toLowerCase())
      )[0];

      if (relevant) {
        if (relevant.cache.length < 1) {
          relevant.cache.push(node);
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
        }
      }
    },
    Declaration(node) {
      relevant = pairs.filter((pair) =>
        pair.decl.test(node.prop.toLowerCase())
      )[0];

      if (relevant) {
        relevant.decls.push(node);
      }
    },
    RootExit() {
      pairs.forEach((pair) => {
        let canon = canonical(pair.replacements);

        pair.decls.forEach((decl) => {
          decl.value = valueParser(decl.value)
            .walk((node) => {
              if (node.type === 'word') {
                node.value = canon(node.value);
              }
            })
            .toString();
        });
        pair.removals.forEach((cached) => cached.remove());
      });
    },
  };
};

export const postcss = true;
