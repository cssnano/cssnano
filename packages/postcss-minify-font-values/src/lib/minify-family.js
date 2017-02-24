import {stringify} from 'postcss-value-parser';
import uniqueExcept from './uniqs';

const uniqs = uniqueExcept('monospace');

// Note that monospace is missing intentionally from this list; we should not
// remove instances of duplicated monospace keywords, it causes the font to be
// rendered smaller in Chrome.

const keywords = [
    'sans-serif',
    'serif',
    'fantasy',
    'cursive',
];

function intersection (haystack, array) {
    return array.some(value => ~haystack.indexOf(value));
};

export default function (nodes, opts) {
    let family = [];
    let last = null;
    let i, max;

    nodes.forEach((node, index, arr) => {
        if (node.type === 'string' || node.type === 'function') {
            family.push(node);
        } else if (node.type === 'word') {
            if (!last) {
                last = {type: 'word', value: ''};
                family.push(last);
            }

            last.value += node.value;
        } else if (node.type === 'space') {
            if (last && index !== arr.length - 1) {
                last.value += ' ';
            }
        } else {
            last = null;
        }
    });

    family = family.map((node) => {
        if (node.type === 'string') {
            if (
                !opts.removeQuotes ||
                intersection(node.value, keywords) ||
                /[0-9]/.test(node.value.slice(0, 1))
            ) {
                return stringify(node);
            }

            let escaped = node.value.split(/\s/).map((word, index, words) => {
                let next = words[index + 1];
                if (next && /^[^a-z]/i.test(next)) {
                    return word + '\\';
                }

                if (!/^[^a-z\d\xa0-\uffff_-]/i.test(word)) {
                    return word.replace(/([^a-z\d\xa0-\uffff_-])/gi, '\\$1');
                }

                if (/^[^a-z]/i.test(word) && index < 1) {
                    return '\\' + word;
                }

                return word;
            }).join(' ');

            if (escaped.length < node.value.length + 2) {
                return escaped;
            }
        }

        return stringify(node);
    });

    if (opts.removeAfterKeyword) {
        for (i = 0, max = family.length; i < max; i += 1) {
            if (~keywords.indexOf(family[i])) {
                family = family.slice(0, i + 1);
                break;
            }
        }
    }

    if (opts.removeDuplicates) {
        family = uniqs(family);
    }

    return [{
        type: 'word',
        value: family.join(),
    }];
};
