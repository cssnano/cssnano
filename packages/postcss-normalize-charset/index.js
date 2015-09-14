var postcss = require('postcss');

module.exports = postcss.plugin('postcss-normalize-charset', function () {
    return function (css) {
        var charsetRule;
        var nonAsciiNode;
        var nonAscii = /[^\x00-\x7F]/;

        css.walk(function (node) {
            if (node.type === 'atrule' && node.name === 'charset') {
                if (!charsetRule) {
                    charsetRule = node;
                }
                node.remove();
            } else if (!nonAsciiNode && node.parent && node.parent.type === 'root' && nonAscii.test(node)) {
                nonAsciiNode = node;
            }
        });

        if (nonAsciiNode) {
            if (!charsetRule) {
                charsetRule = postcss.atRule({
                    name: 'charset',
                    params: '"utf-8"'
                });
            }
            charsetRule.source = nonAsciiNode.source;
            css.root().prepend(charsetRule);
        }
    };
});
