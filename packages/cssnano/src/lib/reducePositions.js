import {plugin} from 'postcss';
import valueParser, {unit} from 'postcss-value-parser';
import has from 'has';
import getArguments from './getArguments';

const directions = ['top', 'right', 'bottom', 'left', 'center'];
const properties = [
    'background',
    'background-position',
    '-webkit-perspective-origin',
    'perspective-origin',
];

const center = '50%';

const horizontal = {
    right: '100%',
    left: '0',
};

const vertical = {
    bottom: '100%',
    top: '0',
};

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
            end: null,
        });
        arg.forEach((part, index) => {
            const isPosition = ~directions.indexOf(part.value) || unit(part.value);
            const len = relevant.length - 1;
            if (relevant[len].start === null && isPosition) {
                relevant[len].start = index;
                relevant[len].end = index;
                return;
            }
            if (relevant[len].start !== null) {
                if (part.type === 'space') {
                    return;
                } else if (isPosition) {
                    relevant[len].end = index;
                    return;
                }
                return;
            }
        });
    });
    relevant.forEach((range, index) => {
        if (range.start === null) {
            return;
        }
        const position = args[index].slice(range.start, range.end + 1);
        if (position.length > 3) {
            return;
        }
        if (position.length === 1 || position[2].value === 'center') {
            if (position[2]) {
                position[2].value = position[1].value = '';
            }
            const {value} = position[0];
            const map = {
                ...horizontal,
                center,
            };
            if (has(map, value)) {
                position[0].value = map[value];
            }
            return;
        }
        if (position[0].value === 'center' && ~directions.indexOf(position[2].value)) {
            position[0].value = position[1].value = '';
            const {value} = position[2];
            if (has(horizontal, value)) {
                position[2].value = horizontal[value];
            }
            return;
        }
        if (has(horizontal, position[0].value) && has(vertical, position[2].value)) {
            position[0].value = horizontal[position[0].value];
            position[2].value = vertical[position[2].value];
            return;
        } else if (has(vertical, position[0].value) && has(horizontal, position[2].value)) {
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
