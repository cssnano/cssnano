import selectorParser from 'postcss-selector-parser';

const atrule = 'atrule';
const decl = 'decl';
const rule = 'rule';
/**
 * @param {{value: string}} arg
 * @param {(input: string) => string[]} comma
 * @param {(input: string) => string[]} space
 * @return {string[]}
 */
function splitValues({ value }, comma, space) {
  let result = [];
  for (const val of comma(value)) {
    result = result.concat(space(val));
  }
  return result;
}

function filterAtRule({ atRules, values }) {
  const uniqueValues = new Set(values);
  atRules.forEach((node) => {
    const hasAtRule = uniqueValues.has(node.params);

    if (!hasAtRule) {
      node.remove();
    }
  });
}

function filterNamespace({ atRules, rules }) {
  const uniqueRules = new Set(rules);
  atRules.forEach((atRule) => {
    const { 0: param, length: len } = atRule.params.split(' ').filter(Boolean);

    if (len === 1) {
      return;
    }

    const hasRule = uniqueRules.has(param) || uniqueRules.has('*');

    if (!hasRule) {
      atRule.remove();
    }
  });
}

function hasFont(fontFamily, cache, comma) {
  return comma(fontFamily).some((font) => cache.some((c) => c.includes(font)));
}

// fonts have slightly different logic
function filterFont({ atRules, values }, comma) {
  values = [...new Set(values)];
  atRules.forEach((r) => {
    const families = r.nodes.filter(({ prop }) => prop === 'font-family');

    // Discard the @font-face if it has no font-family
    if (!families.length) {
      return r.remove();
    }

    families.forEach((family) => {
      if (!hasFont(family.value.toLowerCase(), values, comma)) {
        r.remove();
      }
    });
  });
}

function pluginCreator(opts) {
  const { fontFace, counterStyle, keyframes, namespace } = Object.assign(
    {},
    {
      fontFace: true,
      counterStyle: true,
      keyframes: true,
      namespace: true,
    },
    opts
  );

  return {
    postcssPlugin: 'postcss-discard-unused',

    prepare() {
      const counterStyleCache = { atRules: [], values: [] };
      const keyframesCache = { atRules: [], values: [] };
      const namespaceCache = { atRules: [], rules: [] };
      const fontCache = { atRules: [], values: [] };

      return {
        OnceExit(css, { list }) {
          const { comma, space } = list;
          css.walk((node) => {
            const { type, prop, selector, name } = node;

            if (type === rule && namespace && selector.includes('|')) {
              if (selector.includes('[')) {
                // Attribute selector, so we should parse further.
                selectorParser((ast) => {
                  ast.walkAttributes(({ namespace: ns }) => {
                    namespaceCache.rules = namespaceCache.rules.concat(ns);
                  });
                }).process(selector);
              } else {
                // Use a simple split function for the namespace
                namespaceCache.rules = namespaceCache.rules.concat(
                  selector.split('|')[0]
                );
              }
              return;
            }

            if (type === decl) {
              if (counterStyle && /list-style|system/.test(prop)) {
                counterStyleCache.values = counterStyleCache.values.concat(
                  splitValues(node, comma, space)
                );
              }

              if (
                fontFace &&
                node.parent.type === rule &&
                /font(|-family)/.test(prop)
              ) {
                fontCache.values = fontCache.values.concat(
                  comma(node.value.toLowerCase())
                );
              }

              if (keyframes && /animation/.test(prop)) {
                keyframesCache.values = keyframesCache.values.concat(
                  splitValues(node, comma, space)
                );
              }

              return;
            }

            if (type === atrule) {
              if (counterStyle && /counter-style/.test(name)) {
                counterStyleCache.atRules.push(node);
              }

              if (fontFace && name === 'font-face' && node.nodes) {
                fontCache.atRules.push(node);
              }

              if (keyframes && /keyframes/.test(name)) {
                keyframesCache.atRules.push(node);
              }

              if (namespace && name === 'namespace') {
                namespaceCache.atRules.push(node);
              }

              return;
            }
          });

          counterStyle && filterAtRule(counterStyleCache);
          fontFace && filterFont(fontCache, comma);
          keyframes && filterAtRule(keyframesCache);
          namespace && filterNamespace(namespaceCache);
        },
      };
    },
  };
}

pluginCreator.postcss = true;
export default pluginCreator;
