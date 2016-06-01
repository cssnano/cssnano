import canMerge from './canMerge';
import getLastNode from './getLastNode';
import hasAllProps from './hasAllProps';
import insertCloned from './insertCloned';
import remove from './remove';

function getDecls (rule, properties) {
    return rule.nodes.filter(({prop}) => prop && ~properties.indexOf(prop));
}

function getRules (props, properties) {
    return properties.map(property => {
        return getLastNode(props, property);
    }).filter(Boolean);
}

export default function genericMerge ({rule, properties, prop, value}) {
    let decls = getDecls(rule, properties);

    while (decls.length) {
        let lastNode = decls[decls.length - 1];
        let props = decls.filter(node => node.important === lastNode.important);
        if (hasAllProps(props, ...properties) && canMerge(...props)) {
            insertCloned(rule, lastNode, {
                prop,
                value: value(getRules(props, properties)),
            });
            props.forEach(remove);
        }
        decls = decls.filter(node => !~props.indexOf(node));
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
