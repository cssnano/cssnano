import {plugin} from 'postcss';
import valueParser, {unit} from 'postcss-value-parser';

const directions = ['top', 'right', 'bottom', 'left', 'center'];
const properties = [
    'background',
    'background-position'
];

const horizontal = {
    right: '100%',
    left: '0'
};

const vertical = {
    bottom: '100%',
    top: '0'
};

const hkeys = Object.keys(horizontal);
const vkeys = Object.keys(vertical);

function getArguments (node) {
    return node.nodes.reduce((list, child) => {
        if (child.type !== 'div') {
            list[list.length - 1].push(child);
        } else {
            list.push([]);
        }
        return list;
    }, [[]]);
}

function transform (decl) {
    if (!~properties.indexOf(decl.prop)) {
        return;
    }
    const values = valueParser(decl.value);
    const args = getArguments(values);
    const relevant = [];
    args.forEach(arg => {
        relevant.push({
            start: null,
            end: null
        });
        arg.forEach((part, index) => {
            let isPosition = ~directions.indexOf(part.value) || unit(part.value);
            if (relevant[relevant.length - 1].start === null && isPosition) {
                relevant[relevant.length - 1].start = index;
                return;
            }
            if (relevant[relevant.length - 1].start !== null && (part.type === 'space' || isPosition)) {
                relevant[relevant.length - 1].end = index;
                return;
            }
        });
    });
    relevant.forEach((range, index) => {
        if (range.start === null) {
            return;
        }
        const position = args[index].slice(range.start, (range.end || args[index].length) + 1);
        if (position.length > 3) {
            return;
        }
        if (position.length === 1 || position[2].value === 'center') {
            if (position[2]) {
                position[2].value = position[1].value = '';
            }
            if (position[0].value === 'right') {
                position[0].value = '100%';
                return;
            }
            if (position[0].value === 'left') {
                position[0].value = '0';
                return;
            }
            if (position[0].value === 'center') {
                position[0].value = '50%';
                return;
            }
            return;
        }
        if (position[0].value === 'center' && ~directions.indexOf(position[2].value)) {
            position[0].value = position[1].value = '';
            if (position[2].value === 'right') {
                position[2].value = '100%';
                return;
            }
            if (position[2].value === 'left') {
                position[2].value = '0';
                return;
            }
            return;
        }
        if (~hkeys.indexOf(position[0].value) && ~vkeys.indexOf(position[2].value)) {
            position[0].value = horizontal[position[0].value];
            position[2].value = vertical[position[2].value];
            return;
        } else if (~vkeys.indexOf(position[0].value) && ~hkeys.indexOf(position[2].value)) {
            let first = position[0].value;
            position[0].value = horizontal[position[2].value];
            position[2].value = vertical[first];
            return;
        }
    });
    decl.value = values.toString();
}

export default plugin('cssnano-reduce-positions', () => {
    return css => css.walkDecls(transform);
});
