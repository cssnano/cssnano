import {list} from 'postcss';
import {unit} from 'postcss-value-parser';
import {detect} from 'stylehacks';
import {genericMergeFactory} from '../genericMerge';
import getValue from '../getValue';
import insertCloned from '../insertCloned';

const properties = ['column-width', 'column-count'];
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
    if (rule.nodes.some(detect)) {
        return false;
    }
    rule.walkDecls('columns', decl => {
        let values = list.space(decl.value);
        if (values.length === 1) {
            values.push(auto);
        }

        values.forEach((value, i) => {
            let prop = properties[1];

            if (value === auto) {
                prop = properties[i];
            } else if (unit(value).unit) {
                prop = properties[0];
            }

            insertCloned(rule, decl, {
                prop,
                value,
            });
        });
        decl.remove();
    });
}

const merge = genericMergeFactory({
    prop: 'columns',
    properties,
    value: rules => normalize(rules.map(getValue)),
});

export default {
    explode,
    merge,
};
