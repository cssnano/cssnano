import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

const RESERVED_KEYWORDS = [
    "initial",
];

function unicode (range) {
    const values = range.slice(2).split('-');
    if (values.length < 2) {
        return range;
    }
    const left  = values[0].split('');
    const right = values[1].split('');

    if (left.length !== right.length) {
        return range;
    }

    let questionCounter = 0;

    const merged = left.reduce((group, value, index) => {
        if (group === false) {
            return false;
        }
        if (value === right[index] && !questionCounter) {
            return group + value;
        }
        if (value === '0' && right[index] === 'F') {
            questionCounter ++;
            return group + '?';
        }
        return false;
    }, 'U+');

    /*
     * The maximum number of wildcard characters (?) for ranges is 5.
     */

    if (merged && questionCounter < 6) {
        return merged;
    }

    return range;
}

export default postcss.plugin('postcss-normalize-unicode', () => {
    return css => {
        css.walkDecls(/^unicode-range$/i, node => {
            node.value = valueParser(node.value).walk(child => {
                if (child.type === 'word' && RESERVED_KEYWORDS.indexOf(child.value.toLowerCase()) === -1) {
                    child.value = unicode(child.value.toUpperCase());
                }
                return false;
            }).toString();
        });
    };
});
