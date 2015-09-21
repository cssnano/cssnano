import {list} from 'postcss';
import unit from 'postcss-value-parser/lib/unit';
import clone from '../clone';
import getLastNode from '../getLastNode';

let wc = ['column-width', 'column-count'];

export default {
    explode: rule => {
        rule.eachDecl('columns', decl => {
            let values = list.space(decl.value).sort();
            if (values.length === 1) {
                values.push('auto');
            }

            values.forEach((value, i) => {
                let name = 'column-count';

                if (value === 'auto') {
                    name = i === 0 ? 'column-width' : 'column-count';
                } else if (unit(value).unit !== '') {
                    name = 'column-width';
                }

                let prop = clone(decl);
                prop.prop = name;
                prop.value = value;
                rule.insertAfter(decl, prop);
            });
            decl.removeSelf();
        });
    },
    merge: rule => {
        let decls = rule.nodes.filter(node => node.prop && ~wc.indexOf(node.prop));
        while (decls.length) {
            let lastNode = decls[decls.length - 1];
            let props = decls.filter(node => node.important === lastNode.important);
            let values = wc.map(prop => getLastNode(props, prop).value);
            if (values.length > 1 && values[0] === values[1]) {
                values.pop();
            }
            let shorthand = clone(lastNode);
            shorthand.prop = 'columns';
            shorthand.value = values.join(' ');
            rule.insertAfter(lastNode, shorthand);
            props.forEach(prop => prop.removeSelf());
            decls = decls.filter(node => !~props.indexOf(node));
        }
    }
};
