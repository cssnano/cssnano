import {stringify} from 'postcss-value-parser';

export default function getValue (values) {
    return stringify({
        nodes: values.reduce((nodes, arg, index) => {
            arg.forEach((val, idx) => {
                if (
                    idx === arg.length - 1 &&
                    index === values.length - 1 &&
                    val.type === 'space'
                ) {
                    return;
                }
                nodes.push(val);
            });
            if (index !== values.length - 1) {
                if (
                    nodes[nodes.length - 1] &&
                    nodes[nodes.length - 1].type === 'space'
                ) {
                    nodes[nodes.length - 1].type = 'div';
                    nodes[nodes.length - 1].value = ',';
                    return nodes;
                }
                nodes.push({type: 'div', value: ','});
            }
            return nodes;
        }, [])
    });
}
