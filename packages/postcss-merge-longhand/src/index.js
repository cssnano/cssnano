'use strict';

import postcss from 'postcss';
import canMerge from './lib/canMerge';
import getLastNode from './lib/getLastNode';
import hasAllProps from './lib/hasAllProps';
import identical from './lib/identical';
import mergeValues from './lib/mergeValues';
import minifyTrbl from './lib/minifyTrbl';
import numValues from './lib/numValues';

const trbl = ['top', 'right', 'bottom', 'left'];
const trblProps = [
    'margin',
    'padding',
    'border-color',
    'border-width',
    'border-style'
];

let trblMap = (prop) => trbl.map(direction => `${prop}-${direction}`);

let remove = node => node.remove();

let mergeLonghand = (rule, prop) => {
    let properties = trblMap(prop);
    if (hasAllProps.apply(this, [rule].concat(properties))) {
        let rules = properties.map(p => getLastNode(rule, p));
        if (canMerge.apply(this, rules)) {
            rules.slice(0, 3).forEach(remove);
            rules[3].value = minifyTrbl(mergeValues.apply(this, rules));
            rules[3].prop = prop;
        }
    }
};

export default postcss.plugin('postcss-merge-longhand', () => {
    return css => {
        css.walkRules(rule => {
            rule.nodes.filter(node => node.prop && ~trblProps.indexOf(node.prop)).forEach(node => {
                node.value = minifyTrbl(node.value);
            });
            mergeLonghand(rule, 'margin');
            mergeLonghand(rule, 'padding');
            if (hasAllProps(rule, 'border-color', 'border-style', 'border-width')) {
                let rules = [
                    getLastNode(rule, 'border-width'),
                    getLastNode(rule, 'border-style'),
                    getLastNode(rule, 'border-color')
                ];

                if (canMerge.apply(this, rules) && numValues.apply(this, rules) === 3) {
                    rules.slice(0, 2).forEach(remove);
                    rules[2].prop = 'border';
                    rules[2].value = mergeValues.apply(this, rules);
                }
            }
            if (hasAllProps.apply(this, [rule].concat(trblMap('border')))) {
                let rules = [
                    getLastNode(rule, 'border-top'),
                    getLastNode(rule, 'border-right'),
                    getLastNode(rule, 'border-bottom'),
                    getLastNode(rule, 'border-left')
                ];

                if (canMerge.apply(this, rules) && identical.apply(this, rules)) {
                    rules.slice(0, 3).forEach(remove);
                    rules[3].prop = 'border';
                }
            }
        });
    };
});
