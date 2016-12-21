const postcss = require('postcss');
const valueParser = require('postcss-value-parser');
const { stringify } = valueParser;
const sort = require('alphanum-sort');
const uniqs = require('uniqs');

/**
 * Return the greatest common divisor
 * of two numbers.
 */

function gcd(a, b) {
    return b ? gcd(b, a % b) : a;
}

function aspectRatio(a, b) {
    const divisor = gcd(a, b);

    return [a / divisor, b / divisor];
}

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

function removeNode(node) {
    node.value = '';
    node.type = 'word';
}

module.exports = postcss.plugin('postcss-minify-params', () => {
    return css => {
        css.walkAtRules(rule => {
            if (!rule.params) {
                return;
            }

            const params = valueParser(rule.params);

            params.walk((node, index) => {
                if (node.type === 'div' || node.type === 'function') {
                    node.before = node.after = '';
                    if (
                        node.type === 'function' &&
                        node.nodes[4] &&
                        node.nodes[0].value.indexOf('-aspect-ratio') === 3
                    ) {
                        const [a, b] = aspectRatio(
                            node.nodes[2].value,
                            node.nodes[4].value
                        );
                        node.nodes[2].value = a;
                        node.nodes[4].value = b;
                    }
                } else if (node.type === 'space') {
                    node.value = ' ';
                } else if (node.type === 'word') {
                    if (node.value === 'all' && rule.name === 'media') {
                        const nextSpace = params.nodes[index + 1];
                        const nextWord = params.nodes[index + 2];
                        const secondSpace = params.nodes[index + 3];
                        if (nextWord && nextWord.value === 'and') {
                            removeNode(nextWord);
                            removeNode(nextSpace);
                            if (secondSpace) {
                                removeNode(secondSpace);
                            }
                        }
                        removeNode(node);
                    }
                }
            }, true);

            rule.params = sort(uniqs(split(params.nodes, ',')), {
                insensitive: true
            }).join();

            if (!rule.params.length) {
                rule.raws.afterName = '';
            }
        });
    };
});
