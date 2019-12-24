import * as postcss from 'postcss';
import parser from 'postcss-value-parser';

export default postcss.plugin('postcss-unused-var', () => {
  var varCount = {};
  return (root) => {
    root.walkDecls((rule) => {
      if (rule.parent.selector === ':root') {
        // Not to remove the root var as they can be used in other stylesheets as well
        return;
      }
      // Only to remove the elements declarations var only
      if (/^--(.+)/g.test(rule.prop)) {
        if (!varCount[rule.prop]) {
          varCount[`${rule.prop}_${rule.parent.selector}`] =
            rule.parent.selector;
          varCount[`${rule.prop}_${rule.parent.selector}`] = 1;
        }
      }
    });
    root.walkRules((rule) => {
      Object.keys(varCount).forEach((hashVarName) => {
        if (varCount.hasOwnProperty(hashVarName)) {
          let varName = hashVarName.split('_')[0];
          rule.walkDecls((nodes) => {
            const { value } = nodes;
            parser(value).walk((valNode) => {
              if (valNode.type === 'function' && valNode.value === 'var') {
                valNode.nodes.map((n) => {
                  if (n.value === varName) {
                    varCount[hashVarName] -= 1;
                  }
                });
              }
            });
          });
        }
      });
    });
    root.walkDecls((decl) => {
      Object.keys(varCount).map((hashVarName) => {
        let varName = hashVarName.split('_')[0];
        if (varName === decl.prop) {
          if (varCount[hashVarName] > 0) {
            decl.remove();
          }
        }
      });
    });
  };
});
