import postcss from 'postcss';
import valueParser, {unit, walk} from 'postcss-value-parser';
import convert from './lib/convert';

const LENGTH_UNITS = [
    'em', 'ex', 'ch', 'rem', 'vw', 'vh', 'vmin', 'vmax',
    'cm', 'mm', 'q', 'in', 'pt', 'pc', 'px',
];

function parseWord (node, opts, keepZeroUnit) {
    const pair = unit(node.value);
    if (pair) {
        const num = Number(pair.number);
        const u = pair.unit.toLowerCase();
        if (num === 0) {
            node.value = (
                keepZeroUnit ||
                !~LENGTH_UNITS.indexOf(u) && u !== '%'
            ) ? 0 + u : 0;
        } else {
            node.value = convert(num, u, opts);

            if (
                typeof opts.precision === 'number' &&
                u === 'px' &&
                ~pair.number.indexOf('.')
            ) {
                const precision = Math.pow(10, opts.precision);
                node.value = Math.round(parseFloat(node.value) * precision) / precision + u;
            }
        }
    }
}

function clampOpacity (node) {
    const pair = unit(node.value);
    if (!pair) {
        return;
    }
    let num = Number(pair.number);
    if (num > 1) {
        node.value = 1 + pair.unit;
    } else if (num < 0) {
        node.value = 0 + pair.unit;
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
        const {prop} = decl;
        if (~prop.indexOf('flex') || prop.indexOf('--') === 0) {
            return;
        }

        decl.value = valueParser(decl.value).walk(node => {
            if (node.type === 'word') {
                parseWord(node, opts, shouldStripPercent(decl));
                if (prop === 'opacity' || prop === 'shape-image-threshold') {
                    clampOpacity(node);
                }
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

const plugin = 'postcss-convert-values';

export default postcss.plugin(plugin, (opts = {precision: false}) => {
    if (opts.length === undefined && opts.convertLength !== undefined) {
        console.warn(`${plugin}: \`convertLength\` option is deprecated. Use \`length\``);
        opts.length = opts.convertLength;
    }
    if (opts.length === undefined && opts.convertTime !== undefined) {
        console.warn(`${plugin}: \`convertTime\` option is deprecated. Use \`time\``);
        opts.time = opts.convertTime;
    }
    return css => css.walkDecls(transform(opts));
});
