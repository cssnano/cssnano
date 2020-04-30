import * as postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import unitTransformer from './units';
import selectorTransformer from './selector';
import atRulesTranformerMap from './atRules';

const allowedTransformingTypes = Object.keys(atRulesTranformerMap);
const allowedTransformingTypeSet = new Set(allowedTransformingTypes);

const caseSensitivePropsValue = new Set(['font', 'font-family']);

export default postcss.plugin('postcss-lowercase-props-selectors', () => {
  return (css) => {
    let allAtRulesNames = []; // ignored list for transforming values
    css.walkAtRules((rule) => {
      if (allowedTransformingTypeSet.has(rule.name.toLowerCase())) {
        atRulesTranformerMap[rule.name.toLowerCase()](rule);
      }
      // @font-face doesn't have params
      if (typeof rule.params !== 'undefined') {
        const params = rule.params; // need to copy the params as adding toLowerCase here will change the params in AST
        allAtRulesNames.push(params.toLowerCase());
        // its safe to use the lowercase to matching as only params of
        // @counter-styles is being lowercase and they are case-insensitive
      }
    });

    css.walkRules((rule) => {
      rule.walkDecls((decl) => {
        // handling properties
        // All properties of CSS are case-insensitive. SAFE to transform

        // we cant simply lowercase them as css variables are declared using props syntax only
        if (!/^--(.)+/.test(decl.prop)) {
          decl.prop = decl.prop.toLowerCase();
        }
        // font-family is case sensitive prop, its value should be left as it is
        if (caseSensitivePropsValue.has(decl.prop)) {
          return;
        }
        // a flag variable to check whether css variables are not being transformed
        // as postcss-value-parser recursively creates the nodes, so function (var) containing
        // word (--variable-name) nodes will be walked as function (var) first then word (--variable-name)

        const ignoredListForValues = new Set(allAtRulesNames);

        decl.value = valueParser(decl.value)
          .walk((node) => {
            if (node.type === 'function') {
              node.value = node.value.toLowerCase();
            }

            if (node.type === 'word' && !/^--(.)+/.test(node.value)) {
              if (!ignoredListForValues.has(node.value.toLowerCase())) {
                node.value = node.value.toLowerCase();
              }
            }
            return node;
          })
          .toString();
      });

      // Handling selectors
      rule.selector = selectorTransformer(rule.selector);

      // Handling value's units
      rule.nodes = rule.nodes.map((node) => {
        node.value = node.value && unitTransformer(node.value);
        return node;
      });
    });
  };
});
