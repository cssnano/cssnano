import getDecls from './getDecls';
import hasAllProps from './hasAllProps';
import insertCloned from './insertCloned';
import remove from './remove';

function getAllRules (props, properties) {
    return properties.reduce((list, property) => {
        props.filter(n => n.prop && ~n.prop.indexOf(property)).forEach((result, index) => {
            if (!list[index]) {
                list.push([]);
            }
            list[index].push(result);
        });
        return list;
    }, [[]]);
}


export default function colorMerge ({rule, properties, prop, value}) {
    let decls = getDecls(rule, properties);

    while (decls.length) {
        const lastNode = decls[decls.length - 1];
        const props = decls.filter(node => node.important === lastNode.important);
        if (hasAllProps(props, ...properties)) {
            getAllRules(props, properties).reverse().forEach(group => {
                insertCloned(rule, lastNode, {
                    prop,
                    value: value(group),
                });
            });
            props.forEach(remove);
        }
        decls = decls.filter(node => !~props.indexOf(node));
    }
}
