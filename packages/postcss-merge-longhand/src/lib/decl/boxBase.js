import {detect} from 'stylehacks';
import genericMerge from '../genericMerge';
import hasAllProps from '../hasAllProps';
import canMerge from '../canMerge';
import minifyTrbl from '../minifyTrbl';
import parseTrbl from '../parseTrbl';
import getLastNode from '../getLastNode';
import insertCloned from '../insertCloned';
import mergeValues from '../mergeValues';
import remove from '../remove';
import trbl from '../trbl';

export default prop => {
    const properties = trbl.map(direction => `${prop}-${direction}`);

    const processor = {
        explode: rule => {
            if (rule.nodes.some(detect)) {
                return false;
            }
            rule.walkDecls(prop, decl => {
                let values = parseTrbl(decl.value);
                trbl.forEach((direction, index) => {
                    insertCloned(rule, decl, {
                        prop: `${prop}-${direction}`,
                        value: values[index]
                    });
                });
                decl.removeSelf();
            });
        },
        merge: rule => {
            genericMerge({
                rule,
                prop,
                properties,
                value: rules => {
                    return minifyTrbl(mergeValues.apply(this, rules));
                }
            });

            if (hasAllProps.apply(this, [rule].concat(properties))) {
                let rules = properties.map(p => getLastNode(rule.nodes, p));
                if (canMerge.apply(this, rules)) {
                    rules.slice(0, 3).forEach(remove);
                    rules[3].value = minifyTrbl(mergeValues.apply(this, rules));
                    rules[3].prop = prop;
                }
            }
        }
    };

    return processor;
};
