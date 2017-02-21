import postcss from 'postcss';

let charset = 'charset';

export default postcss.plugin('postcss-normalize-' + charset, (opts = {}) => {
    return css => {
        let charsetRule;
        let nonAsciiNode;
        let nonAscii = /[^\x00-\x7F]/;

        css.walk(node => {
            if (node.type === 'atrule' && node.name === charset) {
                if (!charsetRule) {
                    charsetRule = node;
                }
                node.remove();
            } else if (!nonAsciiNode && node.parent === css && nonAscii.test(node)) {
                nonAsciiNode = node;
            }
        });

        if (nonAsciiNode) {
            if (!charsetRule && opts.add !== false) {
                charsetRule = postcss.atRule({
                    name: charset,
                    params: '"utf-8"',
                });
            }
            if (charsetRule) {
                charsetRule.source = nonAsciiNode.source;
                css.prepend(charsetRule);
            }
        }
    };
});
