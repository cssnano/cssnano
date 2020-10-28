import path from 'path';
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
      if (node.type !== 'function' || node.value.toLowerCase() !== 'url') {
        return false;
      }

      node.before = node.after = '';

      if (!node.nodes.length) {
        return false;
      }
      let url = node.nodes[0];
      let escaped;

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

/* We need this otherwise the `convert()` step will remove the \ escape
  character from already processed urls. */
const processed = Symbol('postcss-normalize-url-processed');
const pluginCreator = (opts) => {
  opts = Object.assign(
    {},
    {
      normalizeProtocol: false,
      stripFragment: false,
      stripWWW: false,
    },
    opts
  );
  return {
    postcssPlugin: 'postcss-normalize-url',
    Declaration(node) {
      if (!node[processed]) {
        transformDecl(node, opts);
        node[processed] = true;
      }
    },
    AtRule: {
      namespace: (node) => {
        if (!node[processed]) {
          transformNamespace(node);
          node[processed] = true;
        }
      },
    },
  };
};

pluginCreator.postcss = true;

export default pluginCreator;
