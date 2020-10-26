let charset = 'charset';

// eslint-disable-next-line no-control-regex
const nonAscii = /[^\x00-\x7F]/;

function shouldSetNonAsciiNode(currentNode, nonAsciiNode) {
  return !nonAsciiNode && nonAscii.test(currentNode);
}

const pluginCreator = (opts = {}) => {
  return {
    postcssPlugin: 'postcss-normalize-' + charset,
    prepare() {
      let charsetRule;
      let nonAsciiNode;
      return {
        AtRule: {
          charset: (node) => {
            if (!charsetRule) {
              charsetRule = node;
            }

            node.remove();
          },
        },
        Comment(node) {
          if (shouldSetNonAsciiNode(node, nonAsciiNode)) {
            nonAsciiNode = node;
          }
        },
        Rule(node) {
          if (shouldSetNonAsciiNode(node, nonAsciiNode)) {
            nonAsciiNode = node;
          }
        },
        OnceExit(css, { AtRule }) {
          if (nonAsciiNode) {
            if (!charsetRule && opts.add !== false) {
              charsetRule = new AtRule({
                name: charset,
                params: '"utf-8"',
              });
            }
            if (charsetRule) {
              charsetRule.source = nonAsciiNode.source;
              css.prepend(charsetRule);
            }
          }
        },
      };
    },
  };
};
pluginCreator.postcss = true;
export default pluginCreator;
