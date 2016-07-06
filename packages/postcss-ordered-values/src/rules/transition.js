import {unit} from 'postcss-value-parser';
import addSpace from '../lib/addSpace';
import getArguments from '../lib/getArguments';
import getParsed from '../lib/getParsed';
import getValue from '../lib/getValue';

// transition: [ none | <single-transition-property> ] || <time> || <single-transition-timing-function> || <time>

const timingFunctions = [
    'ease',
    'linear',
    'ease-in',
    'ease-out',
    'ease-in-out',
    'step-start',
    'step-end',
];

export default function normalizeTransition (decl) {
    if (decl.prop !== 'transition' && decl.prop !== '-webkit-transition') {
        return;
    }
    let parsed = getParsed(decl);
    if (parsed.nodes.length < 2) {
        return;
    }

    let args = getArguments(parsed);
    let abort = false;

    let values = args.reduce((list, arg) => {
        let state = {
            timingFunction: [],
            property: [],
            time1: [],
            time2: [],
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
            if (node.type === 'function' && ~['steps', 'cubic-bezier'].indexOf(node.value)) {
                state.timingFunction = [...state.timingFunction, node, addSpace()];
            } else if (unit(node.value)) {
                if (!state.time1.length) {
                    state.time1 = [...state.time1, node, addSpace()];
                } else {
                    state.time2 = [...state.time2, node, addSpace()];
                }
            } else if (~timingFunctions.indexOf(node.value)) {
                state.timingFunction = [...state.timingFunction, node, addSpace()];
            } else {
                state.property = [...state.property, node, addSpace()];
            }
        });
        return [...list, [...state.property, ...state.time1, ...state.timingFunction, ...state.time2]];
    }, []);

    if (abort) {
        return;
    }

    decl.value = getValue(values);
}
