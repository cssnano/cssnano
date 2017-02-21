import {detect} from 'stylehacks';
import {genericMergeFactory} from '../genericMerge';
import getDecls from '../getDecls';
import minifyTrbl from '../minifyTrbl';
import parseTrbl from '../parseTrbl';
import insertCloned from '../insertCloned';
import mergeValues from '../mergeValues';
import remove from '../remove';
import trbl from '../trbl';

export default prop => {
    const properties = trbl.map(direction => `${prop}-${direction}`);

    const cleanup = rule => {
        let decls = getDecls(rule, [prop].concat(properties));
        while (decls.length) {
            const lastNode = decls[decls.length - 1];

            // remove properties of lower precedence
            const lesser = decls.filter(node => 
                node !== lastNode && 
                node.important === lastNode.important &&
                lastNode.prop === prop && node.prop !== lastNode.prop);

            lesser.forEach(remove);
            decls = decls.filter(node => !~lesser.indexOf(node));
        
            // get duplicate properties
            let duplicates = decls.filter(node => 
                node !== lastNode && 
                node.important === lastNode.important &&
                node.prop === lastNode.prop);

            duplicates.forEach(remove);
            decls = decls.filter(node => node !== lastNode && !~duplicates.indexOf(node));
        }
    };

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
            after: cleanup,
        }),
    };

    return processor;
};
