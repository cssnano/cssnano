import postcss from 'postcss';
import convert from './lib/convert';
import valueParser, {unit, walk} from 'postcss-value-parser';

function parseWord (node, opts, stripZeroUnit) {
    let pair = unit(node.value);
    if (pair) {
        let num = Number(pair.number);
        let u = pair.unit.toLowerCase();
        if (num === 0) {
            node.value = (
                stripZeroUnit ||
                u === 'ms' ||
                u === 's' ||
                u === 'deg'||
                u === 'rad' ||
                u === 'grad' ||
                u === 'turn') ? 0 + u : 0;
        } else {
            node.value = convert(num, u, opts);
        }
    }
}

function shouldStripPercent ({value, prop, parent}) {
    return ~value.indexOf('%') &&
        (prop === 'max-height' || prop === 'height') ||
        parent.parent &&
        parent.parent.name === 'keyframes' &&
        prop === 'stroke-dasharray' ||
        prop === 'stroke-dashoffset' ||
        prop === 'stroke-width';
}

function transform (opts) {
    return decl => {
        if (~decl.prop.indexOf('flex')) {
            return;
        }

        decl.value = valueParser(decl.value).walk(node => {
            if (node.type === 'word') {
                parseWord(node, opts, shouldStripPercent(decl));
            } else if (node.type === 'function') {
                if (node.value === 'calc' ||
                    node.value === 'hsl' ||
                    node.value === 'hsla') {
                    walk(node.nodes, n => {
                        if (n.type === 'word') {
                            parseWord(n, opts, true);
                        }
                    });
                    return false;
                }
                if (node.value === 'url') {
                    return false;
                }
            }
        }).toString();
    };
}

export default postcss.plugin('postcss-convert-values', (opts = {}) => {
    if (opts.length === undefined && opts.convertLength !== undefined) {
        console.warn('postcss-convert-values: `convertLength` option is deprecated. Use `length`');
        opts.length = opts.convertLength;
    }
    if (opts.length === undefined && opts.convertTime !== undefined) {
        console.warn('postcss-convert-values: `convertTime` option is deprecated. Use `time`');
        opts.time = opts.convertTime;
    }
    return css => css.walkDecls(transform(opts));
});
