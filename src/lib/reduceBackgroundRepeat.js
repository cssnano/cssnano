import {plugin} from 'postcss';
import valueParser from 'postcss-value-parser';
import getArguments from './getArguments';
import getMatchFactory from './getMatch';

const mappings = [
    ['repeat-x',  ['repeat', 'no-repeat']],
    ['repeat-y',  ['no-repeat', 'repeat']],
    ['repeat',    ['repeat', 'repeat']],
    ['space',     ['space', 'space']],
    ['round',     ['round', 'round']],
    ['no-repeat', ['no-repeat', 'no-repeat']],
];

const repeat = [
    'repeat-x',
    'repeat-y',
    'repeat',
    'space',
    'round',
    'no-repeat',
];

const getMatch = getMatchFactory(mappings);

function transform (decl) {
    const values = valueParser(decl.value);
    const args = getArguments(values);
    const relevant = [];
    args.forEach(arg => {
        relevant.push({
            start: null,
            end: null,
        });
        arg.forEach((part, index) => {
            const isRepeat = ~repeat.indexOf(part.value);
            const len = relevant.length - 1;
            if (relevant[len].start === null && isRepeat) {
                relevant[len].start = index;
                relevant[len].end = index;
                return;
            }
            if (relevant[len].start !== null) {
                if (part.type === 'space') {
                    return;
                } else if (isRepeat) {
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
        const val = args[index].slice(range.start, range.end + 1);
        if (val.length !== 3) {
            return;
        }
        const match = getMatch(val.filter((list, i) => i % 2 === 0).map(n => n.value));
        if (match.length) {
            args[index][range.start].value = match[0][0];
            args[index][range.start + 1].value = '';
            args[index][range.end].value = '';
        }
    });
    decl.value = values.toString();
}

export default plugin('cssnano-reduce-background-repeat', () => {
    return css => css.walkDecls(/background(-repeat|$)/, transform);
});
