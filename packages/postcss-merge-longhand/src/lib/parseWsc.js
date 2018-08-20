import {list} from 'postcss';
import {isWidth, isStyle, isColor} from './validateWsc';

const none = /^\s*(none|medium)(\s+none(\s+(none|currentcolor))?)?\s*$/i;

export default function parseWsc (value) {
    if (none.test(value)) {
        return [ 'medium', 'none', 'currentcolor'];
    }

    let width, style, color;
    
    const values = list.space(value);
    if (values.length > 1 && isStyle(values[1]) && values[0].toLowerCase() === 'none') {
        values.unshift();
        width = '0';
    }

    const unknown = [];

    values.forEach(v => {
        if (isStyle(v)) {
            style = v.toLowerCase();
        } else if (isWidth(v)) {
            width = v.toLowerCase();
        } else if (isColor(v)) {
            color = v.toLowerCase();
        } else {
            unknown.push(v);
        }
    });

    if (unknown.length) {
        if (!width && style && color) {
            width = unknown.pop();
        }
        if (width && !style && color) {
            style = unknown.pop();
        }
        if (width && style && !color) {
            color = unknown.pop();
        }
    }

    return [ width, style, color ];
}
