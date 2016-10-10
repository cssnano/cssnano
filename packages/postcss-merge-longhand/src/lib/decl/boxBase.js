import {detect} from 'stylehacks';
import {genericMergeFactory} from '../genericMerge';
import minifyTrbl from '../minifyTrbl';
import parseTrbl from '../parseTrbl';
import insertCloned from '../insertCloned';
import mergeValues from '../mergeValues';
import trbl from '../trbl';

export default prop => {
    const properties = trbl.map(direction => `${prop}-${direction}`);

    const processor = {
        explode: rule => {
            if (rule.nodes.some(detect)) {
                return false;
            }
            rule.walkDecls(prop, decl => {
                if (~decl.value.indexOf('inherit')) {
                    return;
                }
                const values = parseTrbl(decl.value);
                trbl.forEach((direction, index) => {
                    insertCloned(rule, decl, {
                        prop: properties[index],
                        value: values[index],
                    });
                });
                decl.remove();
            });
        },
        merge: genericMergeFactory({
            prop,
            properties,
            value: rules => minifyTrbl(mergeValues(...rules)),
        }),
    };

    return processor;
};
