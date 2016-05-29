import {list} from 'postcss';
import {unit} from 'postcss-value-parser';
import insertCloned from '../insertCloned';
import getLastNode from '../getLastNode';
import remove from '../remove';

let wc = ['column-width', 'column-count'];

export default {
    explode: rule => {
        rule.eachDecl('columns', decl => {
            let values = list.space(decl.value).sort();
            if (values.length === 1) {
                values.push('auto');
            }

            values.forEach((value, i) => {
                let name = wc[1];

                if (value === 'auto') {
                    name = i === 0 ? wc[0] : wc[1];
                } else if (unit(value).unit !== '') {
                    name = wc[0];
                }

                insertCloned(rule, decl, {
                    prop: name,
                    value: value
                });
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
            insertCloned(rule, lastNode, {
                prop: 'columns',
                value: values.join(' ')
            });
            props.forEach(remove);
            decls = decls.filter(node => !~props.indexOf(node));
        }
    }
};
