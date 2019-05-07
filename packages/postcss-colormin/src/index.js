import browserslist from 'browserslist';
import postcss from 'postcss';
import valueParser, { stringify } from 'postcss-value-parser';
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

function hasTransparentBug(browser) {
  return ~['ie 8', 'ie 9'].indexOf(browser);
}

function isMathFunctionNode(node) {
  if (node.type !== 'function') {
    return false;
  }

  return ['calc', 'min', 'max', 'clamp'].includes(node.value.toLowerCase());
}

function transform(value, isLegacy, colorminCache) {
  const parsed = valueParser(value);

  walk(parsed, (node, index, parent) => {
    if (node.type === 'function') {
      if (/^(rgb|hsl)a?$/i.test(node.value)) {
        const { value: originalValue } = node;

        node.value = colormin(stringify(node), isLegacy, colorminCache);
        node.type = 'word';

        const next = parent.nodes[index + 1];

        if (
          node.value !== originalValue &&
          next &&
          (next.type === 'word' || next.type === 'function')
        ) {
          parent.nodes.splice(index + 1, 0, {
            type: 'space',
            value: ' ',
          });
        }
      } else if (isMathFunctionNode(node)) {
        return false;
      }
    } else if (node.type === 'word') {
      node.value = colormin(node.value, isLegacy, colorminCache);
    }
  });

  return parsed.toString();
}

export default postcss.plugin('postcss-colormin', () => {
  return (css, result) => {
    const resultOpts = result.opts || {};
    const browsers = browserslist(null, {
      stats: resultOpts.stats,
      path: __dirname,
      env: resultOpts.env,
    });
    const isLegacy = browsers.some(hasTransparentBug);
    const colorminCache = {};
    const cache = {};

    css.walkDecls((decl) => {
      if (
        /^(composes|font|filter|-webkit-tap-highlight-color)/i.test(decl.prop)
      ) {
        return;
      }

      const value = decl.value;

      if (!value) {
        return;
      }

      if (cache[value]) {
        decl.value = cache[value];

        return;
      }

      const newValue = transform(value, isLegacy, colorminCache);

      decl.value = newValue;
      cache[value] = newValue;
    });
  };
});
