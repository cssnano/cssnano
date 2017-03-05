import {plugin} from 'postcss';
import valueParser from 'postcss-value-parser';
import getMatchFactory from 'cssnano-util-get-match';
import mappings from './lib/map';

const getMatch = getMatchFactory(mappings);
const getValue = (node) => parseFloat(node.value);

function evenValues (list, index) {
    return index % 2 === 0;
}

function reduce (node) {
    if (node.type !== 'function') {
        return false;
    }
    if (node.value === 'steps') {
        // Don't bother checking the step-end case as it has the same length
        // as steps(1)
        if (
            getValue(node.nodes[0]) === 1 &&
            node.nodes[2] &&
            node.nodes[2].value === 'start'
        ) {
            node.type = 'word';
            node.value = 'step-start';
            delete node.nodes;
            return;
        }
        // The end case is actually the browser default, so it isn't required.
        if (node.nodes[2] && node.nodes[2].value === 'end') {
            node.nodes = [node.nodes[0]];
            return;
        }
        return false;
    }
    if (node.value === 'cubic-bezier') {
        const match = getMatch(node.nodes.filter(evenValues).map(getValue));

        if (match) {
            node.type = 'word';
            node.value = match;
            delete node.nodes;
            return;
        }
    }
}

export default plugin('cssnano-reduce-timing-functions', () => {
    return css => {
        css.walkDecls(/(animation|transition)(-timing-function|$)/, decl => {
            decl.value = valueParser(decl.value).walk(reduce).toString();
        });
    };
});
