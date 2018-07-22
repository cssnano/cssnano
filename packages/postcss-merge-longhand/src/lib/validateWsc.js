import colorNames from 'css-color-names';

const widths = ['thin', 'medium', 'thick'];
const styles = ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'];
const colors = Object.keys(colorNames);

export function isStyle (value) {
    return value && !!~styles.indexOf(value);
}

export function isWidth (value) {
    return value && !!~widths.indexOf(value) || /^(\d+(\.\d+)?|\.\d+)(\w+)?$/.test(value);
}

export function isColor (value) {
    if (!value) {
        return false;
    }

    if (/rgba?\(/.test(value)) {
        return true;
    }

    if (/hsla?\(/.test(value)) {
        return true;
    }

    if (/#([0-9a-zA-Z]{6}|[0-9a-zA-Z]{3})/.test(value)) {
        return true;
    }
    if (value === 'transparent') {
        return true;
    }

    if (value === 'currentColor') {
        return true;
    }

    return !!~colors.indexOf(value);
}

export function isValidWsc (wscs) {
    const validWidth = isWidth(wscs[0]);
    const validStyle = isStyle(wscs[1]);
    const validColor = isColor(wscs[2]);

    return (
        validWidth && validStyle ||
        validWidth && validColor ||
        validStyle && validColor);
}
