import {unit} from 'postcss-value-parser';
import addSpace from '../lib/addSpace';
import getArguments from '../lib/getArguments';
import getValue from '../lib/getValue';

// box-shadow: inset? && <length>{2,4} && <color>?

export default function normalizeBoxShadow (decl, parsed) {
    let args = getArguments(parsed);
    let abort = false;

    let values = args.reduce((list, arg) => {
        let val = [];
        let state = {
            inset: [],
            color: [],
        };
        arg.forEach(node => {
            if (node.type === 'function' && ~node.value.indexOf('calc')) {
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
