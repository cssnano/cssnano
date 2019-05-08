import path from 'path';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import normalize from 'normalize-url';
import isAbsolute from 'is-absolute-url';

const multiline = /\\[\r\n]/;
// eslint-disable-next-line no-useless-escape
const escapeChars = /([\s\(\)"'])/g;

function convert(url, options) {
  if (isAbsolute(url) || url.startsWith('//')) {
    let normalizedURL = null;

    try {
      normalizedURL = normalize(url, options);
    } catch (e) {
      normalizedURL = url;
    }

    return normalizedURL;
  }

  // `path.normalize` always returns backslashes on Windows, need replace in `/`
  return path.normalize(url).replace(new RegExp('\\' + path.sep, 'g'), '/');
}

function transformNamespace(rule) {
  rule.params = valueParser(rule.params)
    .walk((node) => {
      if (
        node.type === 'function' &&
        node.value.toLowerCase() === 'url' &&
        node.nodes.length
      ) {
        node.type = 'string';
        node.quote = node.nodes[0].quote || '"';
        node.value = node.nodes[0].value;
      }
      if (node.type === 'string') {
        node.value = node.value.trim();
      }
      return false;
    })
    .toString();
}

function transformDecl(decl, opts) {
  decl.value = valueParser(decl.value)
    .walk((node) => {
      if (
        node.type !== 'function' ||
        node.value.toLowerCase() !== 'url' ||
        !node.nodes.length
      ) {
        return false;
      }

      let url = node.nodes[0];
      let escaped;

      node.before = node.after = '';
      url.value = url.value.trim().replace(multiline, '');

      // Skip empty URLs
      // Empty URL function equals request to current stylesheet where it is declared
      if (url.value.length === 0) {
        url.quote = '';

        return false;
      }

      if (/^data:(.*)?,/i.test(url.value)) {
        return false;
      }

      if (!/^.+-extension:\//i.test(url.value)) {
        url.value = convert(url.value, opts);
      }

      if (escapeChars.test(url.value) && url.type === 'string') {
        escaped = url.value.replace(escapeChars, '\\$1');

        if (escaped.length < url.value.length + 2) {
          url.value = escaped;
          url.type = 'word';
        }
      } else {
        url.type = 'word';
      }

      return false;
    })
    .toString();
}

export default postcss.plugin('postcss-normalize-url', (opts) => {
  opts = Object.assign(
    {},
    {
      normalizeProtocol: false,
      stripFragment: false,
      stripWWW: false,
    },
    opts
  );

  return (css) => {
    css.walk((node) => {
      if (node.type === 'decl') {
        return transformDecl(node, opts);
      } else if (
        node.type === 'atrule' &&
        node.name.toLowerCase() === 'namespace'
      ) {
        return transformNamespace(node);
      }
    });
  };
});
