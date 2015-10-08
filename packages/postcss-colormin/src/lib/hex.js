'use strict';

export function toShorthand (hex) {
    if (hex.length === 7 &&
        hex[1] === hex[2] &&
        hex[3] === hex[4] &&
        hex[5] === hex[6]
    ) {
        return '#' + hex[2] + hex[4] + hex[6];
    }
    return hex;
};

export function toLonghand (hex) {
    if (hex.length !== 4) {
        return hex;
    }

    let h = hex.substring(1);
    let r = h[0];
    let g = h[1];
    let b = h[2];
    return '#' + r + r + g + g + b + b;
};

export function isHex (hex) {
    if (hex[0] === '#') {
        let c = toLonghand(hex).substring(1);
        return c.length === 6 && !isNaN(parseInt(c, 16));
    }
    return false;
}
