import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import evenValues from './evenValues';
import getMatchFactory from './getMatch';

/**
 * Specification: https://drafts.csswg.org/css-display/#the-display-properties
 */

const mappings = [
    ['block', ['block', 'flow']],
    ['flow-root', ['block', 'flow-root']],
    ['inline', ['inline', 'flow']],
    ['inline-block', ['inline', 'flow-root']],
    ['run-in', ['run-in', 'flow']],
    ['list-item', ['list-item', 'block', 'flow']],
    ['inline list-item', ['list-item', 'inline', 'flow']],
    ['flex', ['block', 'flex']],
    ['inline-flex', ['inline', 'flex']],
    ['grid', ['block', 'grid']],
    ['inline-grid', ['inline', 'grid']],
    ['ruby', ['inline', 'ruby']],
    ['table', ['block', 'table']],
    ['inline-table', ['inline', 'table']],
    ['table-cell', ['table-cell', 'flow']],
    ['table-caption', ['table-caption', 'flow']],
    ['ruby-base', ['ruby-base', 'flow']],
    ['ruby-text', ['ruby-text', 'flow']],
];

const getMatch = getMatchFactory(mappings);

function transform (node) {
    const {nodes} = valueParser(node.value);
    if (nodes.length === 1) {
        return;
    }
    const match = getMatch(nodes.filter(evenValues).map(n => n.value));
    if (match.length) {
        node.value = match[0][0];
    }
}

const plugin = postcss.plugin('cssnano-reduce-display-values', () => {
    return css => css.walkDecls('display', transform);
});

plugin.mappings = mappings;

export default plugin;
