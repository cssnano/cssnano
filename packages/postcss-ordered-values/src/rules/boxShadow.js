import valueParser, {unit, stringify} from 'postcss-value-parser';

function getArguments (node) {
    return node.nodes.reduce((list, child) => {
        if (child.type !== 'div' || child.value !== ',') {
            list[list.length - 1].push(child);
        } else {
            list.push([]);
        }
        return list;
    }, [[]]);
}

// box-shadow: inset? && <length>{2,4} && <color>?

export default function normalizeBoxShadow (decl) {
    if (decl.prop !== 'box-shadow') {
        return;
    }
    let parsed = valueParser(decl.value);
    if (parsed.nodes.length < 2) {
        return;
    }
    
    let args = getArguments(parsed);
    let values = [];

    args.forEach(arg => {
        values.push([]);
        let value = values[values.length - 1];
        let state = {
            inset: [],
            color: []
        };
        arg.forEach(node => {
            if (node.type === 'space') {
                return;
            }
            if (unit(node.value)) {
                value.push(node);
                value.push({type: 'space', value: ' '});
            } else if (node.value === 'inset') {
                state.inset.push(node);
                state.inset.push({type: 'space', value: ' '});
            } else {
                state.color.push(node);
                state.color.push({type: 'space', value: ' '});
            }
        });
        values[values.length - 1] = state.inset.concat(value).concat(state.color);
    });

    decl.value = stringify({
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
                if (nodes[nodes.length - 1] && nodes[nodes.length - 1].type === 'space') {
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
