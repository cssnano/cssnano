import browserslist from 'browserslist';
import postcss from 'postcss';
import valueParser, { stringify } from 'postcss-value-parser';
import cacheFn from './lib/cacheFn';
import includedIn from './lib/includedIn';
import isFunctionNode from './lib/isFunctionNode';
import isMathFunctionNode from './lib/isMathFunctionNode';
import isWordNode from './lib/isWordNode';
import colormin from './colours';

function walk(parent, callback) {
  parent.nodes.forEach((node, index) => {
    const bubble = callback(node, index, parent);

    if (node.nodes && bubble !== false) {
      walk(node, callback);
    }
  });
}

/*
 * IE 8 & 9 do not properly handle clicks on elements
 * with a `transparent` `background-color`.
 *
 * https://developer.mozilla.org/en-US/docs/Web/Events/click#Internet_Explorer
 */

const hasTransparentBug = includedIn(['ie 8', 'ie 9']);

const transform = cacheFn((value, isLegacy) => {
  const parsed = valueParser(value);

  walk(parsed, (node, index, parent) => {
    if (isFunctionNode(node)) {
      if (/^(rgb|hsl)a?$/i.test(node.value)) {
        const { value: originalValue } = node;

        node.value = colormin(stringify(node), isLegacy);
        node.type = 'word';

        const next = parent.nodes[index + 1];

        if (
          node.value !== originalValue &&
          next &&
          (isWordNode(next) || isFunctionNode(next))
        ) {
          parent.nodes.splice(index + 1, 0, {
            type: 'space',
            value: ' ',
          });
        }
      } else if (isMathFunctionNode(node)) {
        return false;
      }
    } else if (isWordNode(node)) {
      node.value = colormin(node.value, isLegacy);
    }
  });

  return parsed.toString();
});

export default postcss.plugin('postcss-colormin', () => {
  return (css, result) => {
    const resultOpts = result.opts || {};
    const browsers = browserslist(null, {
      stats: resultOpts.stats,
      path: __dirname,
      env: resultOpts.env,
    });
    const isLegacy = browsers.some(hasTransparentBug);

    css.walkDecls(
      /^(?!composes|font|filter|-webkit-tap-highlight-color)/i,
      (decl) => {
        const { value } = decl;

        if (!value) {
          return;
        }

        decl.value = transform(value, isLegacy);
      }
    );
  };
});
