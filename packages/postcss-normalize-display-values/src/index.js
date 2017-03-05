import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import getMatchFactory from 'cssnano-util-get-match';
import mappings from './lib/map';

const getMatch = getMatchFactory(mappings);

function evenValues (list, index) {
    return index % 2 === 0;
}

function transform (node) {
    const {nodes} = valueParser(node.value);
    if (nodes.length === 1) {
        return;
    }
    const match = getMatch(nodes.filter(evenValues).map(n => n.value));
    if (match) {
        node.value = match;
    }
}

export default postcss.plugin('postcss-normalize-display-values', () => {
    return css => css.walkDecls('display', transform);
});
