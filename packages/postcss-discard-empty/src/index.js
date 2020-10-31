const postcssPlugin = 'postcss-discard-empty';

function discardAndReport(node, result) {
  node.remove();

  result.messages.push({
    type: 'removal',
    postcssPlugin,
    node,
  });
}

const pluginCreator = () => {
  return {
    postcssPlugin,
    prepare(result) {
      return {
        /* A declaration is empty if and only if its value is empty.
         since it has no nodes */
        Declaration(decl) {
          if (!decl.value) {
            discardAndReport(decl, result);
          }
        },
        Rule(rule) {
          if (!rule.selector || (rule.nodes && !rule.nodes.length)) {
            discardAndReport(rule, result);
          }
        },
        AtRule(atRule) {
          /* The order of the boolean conditions matter,
            as we want to remove media at rules even if they have params but no other children,
            but we want to keep charset at rules which only have params.
           */
          if (
            (atRule.nodes && !atRule.nodes.length) ||
            (!atRule.nodes && !atRule.params) ||
            (!atRule.params && !atRule.nodes.length)
          ) {
            discardAndReport(atRule, result);
          }
        },
      };
    },
  };
};

pluginCreator.postcss = true;

export default pluginCreator;
