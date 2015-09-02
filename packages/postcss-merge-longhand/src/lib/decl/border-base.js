'use strict';

import {list} from 'postcss';
import clone from '../clone';
import hasAllProps from '../hasAllProps';
import getLastNode from '../getLastNode';
import canMerge from '../canMerge';

export default direction => {
    let wsc = ['width', 'style', 'color'].map(d => `border-${direction}-${d}`);
    let declaration = 'border-' + direction;
    let processor = {
        explode: rule => {
            rule.eachDecl(declaration, decl => {
                let values =  list.space(decl.value);
                wsc.forEach((prop, index) => {
                    let node = clone(decl);
                    node.prop = prop;
                    node.value = values[index];
                    rule.insertAfter(decl, node);
                });
                decl.removeSelf();
            });
        },
        merge: rule => {
            let decls = rule.nodes.filter(node => node.prop && ~wsc.indexOf(node.prop));
            while (decls.length) {
                let lastNode = decls[decls.length - 1];
                let props = decls.filter(node => node.important === lastNode.important);
                if (hasAllProps.apply(this, [props].concat(wsc)) && canMerge.apply(this, props)) {
                    let values = wsc.map(prop => getLastNode(props, prop).value);
                    let shorthand = clone(lastNode);
                    shorthand.prop = declaration;
                    shorthand.value = values.join(' ');
                    rule.insertAfter(lastNode, shorthand);
                    props.forEach(prop => prop.removeSelf());
                }
                decls = decls.filter(node => !~props.indexOf(node));
            }
        }
    };

    return processor;
};
