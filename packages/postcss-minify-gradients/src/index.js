import postcss from 'postcss';
import valueParser, {unit} from 'postcss-value-parser';

const angles = {
    top:    '0deg',
    right:  '90deg',
    bottom: '180deg',
    left:   '270deg'
};

function getArguments (node) {
    return node.nodes.reduce((list, child) => {
        if (child.type !== 'div') {
            list[list.length - 1].push(child);
        } else {
            list.push([]);
        }
        return list;
    }, [[]]);
}

function isLessThan (a, b) {
    return a.unit === b.unit && parseInt(a.number, 10) >= parseInt(b.number, 10);
}

function optimise (decl) {
    if (!~decl.value.indexOf('gradient')) {
        return;
    }
    decl.value = valueParser(decl.value).walk(node => {
        if (node.type !== 'function') {
            return false;
        }
        if (
            node.value === 'linear-gradient' ||
            node.value === 'repeating-linear-gradient' ||
            node.value === '-webkit-linear-gradient' ||
            node.value === '-webkit-repeating-linear-gradient'
        ) {
            let args = getArguments(node);
            if (node.nodes[0].value === 'to' && args[0].length === 3) {
                node.nodes = node.nodes.slice(2);
                node.nodes[0].value = angles[node.nodes[0].value];
            }
            let lastStop;
            args.forEach((arg, index) => {
                if (!arg[2]) {
                    return;
                }
                let thisStop = unit(arg[2].value);
                if (!lastStop) {
                    lastStop = thisStop;
                    if (lastStop && lastStop.number === '0' && lastStop.unit !== 'deg') {
                        arg[1].value = arg[2].value = '';
                    }
                    return;
                }
                if (isLessThan(lastStop, thisStop)) {
                    arg[2].value = 0;
                }
                lastStop = thisStop;
                if (index === args.length - 1 && arg[2].value === '100%') {
                    arg[1].value = arg[2].value = '';
                }
            });
            return false;
        }
        if (
            node.value === 'radial-gradient' ||
            node.value === 'repeating-radial-gradient' ||
            node.value === '-webkit-radial-gradient' ||
            node.value === '-webkit-repeating-radial-gradient'
        ) {
            let args = getArguments(node);
            let lastStop;
            args.forEach(arg => {
                if (!arg[2]) {
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
