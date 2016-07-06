import {unit} from 'postcss-value-parser';
import addSpace from '../lib/addSpace';
import getArguments from '../lib/getArguments';
import getParsed from '../lib/getParsed';
import getValue from '../lib/getValue';

// box-shadow: inset? && <length>{2,4} && <color>?

export default function normalizeBoxShadow (decl) {
    if (decl.prop !== 'box-shadow') {
        return;
    }
    let parsed = getParsed(decl);
    if (parsed.nodes.length < 2) {
        return;
    }

    let args = getArguments(parsed);
    let abort = false;

    let values = args.reduce((list, arg) => {
        let val = [];
        let state = {
            inset: [],
            color: [],
        };
        arg.forEach(node => {
            if (
                node.type === 'comment' ||
                node.type === 'function' && node.value === 'var'
            ) {
                abort = true;
                return;
            }
            if (node.type === 'space') {
                return;
            }
            if (unit(node.value)) {
                val = [...val, node, addSpace()];
            } else if (node.value === 'inset') {
                state.inset = [...state.inset, node, addSpace()];
            } else {
                state.color = [...state.color, node, addSpace()];
            }
        });
        return [...list, [...state.inset, ...val, ...state.color]];
    }, []);

    if (abort) {
        return;
    }

    decl.value = getValue(values);
}
