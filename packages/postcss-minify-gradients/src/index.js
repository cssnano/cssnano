import postcss from 'postcss';
import valueParser, {unit, stringify} from 'postcss-value-parser';
import getArguments from 'lerna:cssnano-util-get-arguments';
import isColorStop from 'is-color-stop';

const angles = {
    top:    '0deg',
    right:  '90deg',
    bottom: '180deg',
    left:   '270deg',
};

function isLessThan (a, b) {
    return a.unit === b.unit && parseFloat(a.number) >= parseFloat(b.number);
}

function optimise (decl) {
    if (!~decl.value.toLowerCase().indexOf('gradient')) {
        return;
    }
    decl.prop = decl.prop.toLowerCase();
    decl.value = valueParser(decl.value).walk(node => {
        if (node.type !== 'function' || !node.nodes.length) {
            return false;
        }

        const value = node.value.toLowerCase();

        if (
            value === 'linear-gradient' ||
            value === 'repeating-linear-gradient' ||
            value === '-webkit-linear-gradient' ||
            value === '-webkit-repeating-linear-gradient'
        ) {
            let args = getArguments(node);
            if (node.nodes[0].value.toLowerCase() === 'to' && args[0].length === 3) {
                node.nodes = node.nodes.slice(2);
                node.nodes[0].value = angles[node.nodes[0].value.toLowerCase()];
            }
            let lastStop = null;
            args.forEach((arg, index) => {
                if (!arg[2]) {
                    return;
                }
                let isFinalStop = index === args.length - 1;
                let thisStop = unit(arg[2].value);
                if (lastStop === null) {
                    lastStop = thisStop;
                    if (!isFinalStop && lastStop && lastStop.number === '0' && lastStop.unit.toLowerCase() !== 'deg') {
                        arg[1].value = arg[2].value = '';
                    }
                    return;
                }
                if (isLessThan(lastStop, thisStop)) {
                    arg[2].value = 0;
                }
                lastStop = thisStop;
                if (isFinalStop && arg[2].value === '100%') {
                    arg[1].value = arg[2].value = '';
                }
            });
            return false;
        }
        if (
            value === 'radial-gradient' ||
            value === 'repeating-radial-gradient'
        ) {
            let args = getArguments(node);
            let lastStop;
            const hasAt = args[0].find(n => n.value.toLowerCase() === 'at');
            args.forEach((arg, index) => {
                if (!arg[2] || !index && hasAt) {
                    return;
                }
                let thisStop = unit(arg[2].value);
                if (!lastStop) {
                    lastStop = thisStop;
                    return;
                }
                if (isLessThan(lastStop, thisStop)) {
                    arg[2].value = 0;
                }
                lastStop = thisStop;
            });
            return false;
        }
        if (
            value === '-webkit-radial-gradient' ||
            value === '-webkit-repeating-radial-gradient'
        ) {
            let args = getArguments(node);
            let lastStop;
            args.forEach((arg) => {
                let color;
                let stop;
                if (arg[2] !== undefined) {
                    if (arg[0].type === 'function') {
                        color = `${arg[0].value}(${stringify(arg[0].nodes)})`;
                    } else {
                        color = arg[0].value;
                    }
                    if (arg[2].type === 'function') {
                        stop = `${arg[2].value}(${stringify(arg[2].nodes)})`;
                    } else {
                        stop = arg[2].value;
                    }
                } else {
                    if (arg[0].type === 'function') {
                        color = `${arg[0].value}(${stringify(arg[0].nodes)})`;
                    }
                    color = arg[0].value;
                }
                const colorStop = stop || stop === 0 ?
                  isColorStop(color, stop) :
                  isColorStop(color);

                if (!colorStop || !arg[2]) {
                    return;
                }
                let thisStop = unit(arg[2].value);
                if (!lastStop) {
                    lastStop = thisStop;
                    return;
                }
                if (isLessThan(lastStop, thisStop)) {
                    arg[2].value = 0;
                }
                lastStop = thisStop;
            });
            return false;
        }
    }).toString();
}

export default postcss.plugin('postcss-minify-gradients', () => {
    return css => css.walkDecls(optimise);
});
