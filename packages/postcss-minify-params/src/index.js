const postcss = require('postcss');
const valueParser = require('postcss-value-parser');
const { stringify } = valueParser;
const sort = require('alphanum-sort');
const uniqs = require('uniqs');

function split(nodes, div) {
    const result = [];
    let i, max, node;
    let last = '';

    for (i = 0, max = nodes.length; i < max; i += 1) {
        node = nodes[i];
        if (node.type === 'div' && node.value === div) {
            result.push(last);
            last = '';
        } else {
            last += stringify(node);
        }
    }

    result.push(last);

    return result;
}

module.exports = postcss.plugin('postcss-minify-params', () => {
    return css => {
        css.walkAtRules(rule => {
            if (!rule.params) {
                return;
            }

            const params = valueParser(rule.params);

            params.walk(node => {
                if (node.type === 'div' || node.type === 'function') {
                    node.before = node.after = '';
                } else if (node.type === 'space') {
                    node.value = ' ';
                }
            }, true);

            rule.params = sort(uniqs(split(params.nodes, ',')), {
                insensitive: true
            }).join();
        });
    };
});
