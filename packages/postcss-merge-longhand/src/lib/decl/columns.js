import {list} from 'postcss';
import {unit} from 'postcss-value-parser';
import genericMerge from '../genericMerge';
import insertCloned from '../insertCloned';

const wc = ['column-width', 'column-count'];
const auto = 'auto';

/**
 * Normalize a columns shorthand definition. Both of the longhand
 * properties' initial values are 'auto', and as per the spec,
 * omitted values are set to their initial values. Thus, we can
 * remove any 'auto' definition when there are two values.
 *
 * Specification link: https://www.w3.org/TR/css3-multicol/
 */

function normalize (values) {
    if (values[0] === auto) {
        return values[1];
    }
    if (values[1] === auto) {
        return values[0];
    }
    return values.join(' ');
}

function explode (rule) {
    rule.walkDecls('columns', decl => {
        let values = list.space(decl.value);
        if (values.length === 1) {
            values.push(auto);
        }

        values.forEach((value, i) => {
            let prop = wc[1];

            if (value === auto) {
                prop = i === 0 ? wc[0] : wc[1];
            } else if (unit(value).unit) {
                prop = wc[0];
            }

            insertCloned(rule, decl, {
                prop,
                value,
            });
        });
        decl.remove();
    });
}

function merge (rule) {
    return genericMerge({
        rule,
        prop: 'columns',
        properties: wc,
        value: rules => {
            return normalize(rules.map(r => r.value));
        }
    });
}

export default {
    explode,
    merge,
};
