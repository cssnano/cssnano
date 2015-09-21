import hasAllProps from '../hasAllProps';
import canMerge from '../canMerge';
import minifyTrbl from '../minifyTrbl';
import parseTrbl from '../parseTrbl';
import getLastNode from '../getLastNode';
import insertCloned from '../insertCloned';
import mergeValues from '../mergeValues';
import valueType from '../type';
import {detect} from 'stylehacks';

const trbl = ['top', 'right', 'bottom', 'left'];

export default property => {
    let processor = {
        explode: rule => {
            if (rule.nodes.some(detect)) {
                return false;
            }
            rule.walkDecls(property, decl => {
                let values = parseTrbl(decl.value);
                trbl.forEach((direction, index) => {
                    insertCloned(rule, decl, {
                        prop: `${property}-${direction}`,
                        value: values[index]
                    });
                });
                decl.removeSelf();
            });
        },
        merge: rule => {
            let properties = trbl.map(direction => `${property}-${direction}`);
            let decls = rule.nodes.filter(node => node.prop && ~properties.indexOf(node.prop));

            while (decls.length) {
                let lastNode = decls[decls.length - 1];
                let type = valueType(lastNode);
                let props = decls.filter(node => valueType(node) === type && node.important === lastNode.important);
                if (hasAllProps.apply(this, [props].concat(properties))) {
                    let rules = properties.map(prop => getLastNode(props, prop));
                    insertCloned(rule, lastNode, {
                        prop: property,
                        value: minifyTrbl(mergeValues.apply(this, rules))
                    });
                    props.forEach(prop => prop.remove());
                }
                decls = decls.filter(node => !~props.indexOf(node));
            }

            if (hasAllProps.apply(this, [rule].concat(properties))) {
                let rules = properties.map(p => getLastNode(rule.nodes, p));
                if (canMerge.apply(this, rules)) {
                    rules.slice(0, 3).forEach(r => r.remove());
                    rules[3].value = minifyTrbl(mergeValues.apply(this, rules));
                    rules[3].prop = property;
                }
            }
        }
    };

    return processor;
};
