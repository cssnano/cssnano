import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import getArguments from 'lerna:cssnano-util-get-arguments';
import getMatchFactory from 'lerna:cssnano-util-get-match';
import mappings from './lib/map';

function evenValues (list, index) {
    return index % 2 === 0;
}

const repeatKeywords = mappings.map((mapping) => mapping[0]);

const getMatch = getMatchFactory(mappings);

function transform (decl) {
    const values = valueParser(decl.value);
    if (values.nodes.length === 1) {
        return;
    }
    const args = getArguments(values);
    const relevant = [];
    args.forEach(arg => {
        relevant.push({
            start: null,
            end: null,
        });
        arg.forEach((part, index) => {
            const isRepeat = ~repeatKeywords.indexOf(part.value);
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
        const match = getMatch(val.filter(evenValues).map(n => n.value));
        if (match) {
            args[index][range.start].value = match;
            args[index][range.start + 1].value = '';
            args[index][range.end].value = '';
        }
    });
    decl.value = values.toString();
}

export default postcss.plugin('postcss-normalize-repeat-style', () => {
    return css => css.walkDecls(/background(-repeat)?|(-webkit-)?mask-repeat/i, transform);
});
