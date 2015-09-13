'use strict';

import postcss from 'postcss';
import convert from './lib/convert';
import valueParser, {unit} from 'postcss-value-parser';
import dropLeadingZero from './lib/drop-leading-zero';

function transform(opts) {
    return decl => {
        if (~decl.prop.indexOf('flex')) {
            return;
        }

        decl.value = valueParser(decl.value).walk(function (node) {
            if (node.type === 'word') {
                let pair = unit(node.value);
                if (pair) {
                    let num = Number(pair.number);
                    let u = pair.unit.toLowerCase();
                    if (num === 0) {
                        let value = (u === 'ms' || u === 's') ? 0 + u : 0;
                        node.value = value;
                    } else if (opts.convertUnit !== false) {
                        node.value = convert(num, u);
                    } else {
                        node.value = dropLeadingZero(num) + u;
                    }
                }
            }
            if (node.type === 'function' && node.value !== 'calc') {
                return false;
            }
        }).toString();
    };
}


export default postcss.plugin('postcss-convert-values', (opts) => {
    opts = opts || {};
    return css => {
        css.walkDecls(transform(opts));
    };
});
