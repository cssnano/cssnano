import canMerge from './canMerge';
import getDecls from './getDecls';
import getRules from './getRules';
import hasAllProps from './hasAllProps';
import insertCloned from './insertCloned';
import remove from './remove';

export default function genericMerge ({rule, properties, prop, value, sanitize = true}) {
    let decls = getDecls(rule, properties);

    while (decls.length) {
        const lastNode = decls[decls.length - 1];
        const filteredProps = decls.filter(node => node.important === lastNode.important);
        const props = getRules(filteredProps, properties);
        const mergeable = sanitize ? canMerge(...props) : true;
        if (hasAllProps(props, ...properties) && mergeable) {
            insertCloned(rule, lastNode, {
                prop,
                value: value(getRules(props, properties)),
            });
            filteredProps.forEach(remove);
            decls = decls.filter(node => !~filteredProps.indexOf(node));
        }
        decls = decls.filter(node => node !== lastNode);
    }
}

export function genericMergeFactory ({properties, prop, value}) {
    return function merge (rule) {
        return genericMerge({
            rule,
            properties,
            prop,
            value,
        });
    };
}
