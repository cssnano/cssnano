import {list} from 'postcss';

export default v => {
    let s = typeof v === 'string' ? list.space(v) : v;
    let value = [
        s[0],                // top
        s[1] || s[0],        // right
        s[2] || s[0],        // bottom
        s[3] || s[1] || s[0] // left
    ];
    if (value[3] === value[1]) {
        value.pop();
        if (value[2] === value[0]) {
            value.pop();
            if (value[0] === value[1]) {
                value.pop();
            }
        }
    }
    return value.join(' ');
};
