import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import SVGO from 'svgo';
import isSvg from 'is-svg';
import {encode, decode} from './lib/url';

const PLUGIN = 'postcss-svgo';
const dataURI = /data:image\/svg\+xml(;((charset=)?utf-8|base64))?,/i;
const dataURIBase64 = /data:image\/svg\+xml;base64,/i;

function minifyPromise (svgo, decl, opts) {
    const promises = [];

    decl.value = valueParser(decl.value).walk(node => {
        if (node.type !== 'function' || node.value !== 'url' || !node.nodes.length) {
            return;
        }

        let {value, quote} = node.nodes[0];
        let isBase64, isUriEncoded;
        let svg = value.replace(dataURI, '');

        if (dataURIBase64.test(value)) {
            svg = Buffer.from(svg, 'base64').toString('utf8');
            isBase64 = true;
        } else {
            let decodedUri;

            try {
                decodedUri = decode(svg);
                isUriEncoded = decodedUri !== svg;
            } catch (e) {
                // Swallow exception if we cannot decode the value
                isUriEncoded = false;
            }

            if (isUriEncoded) {
                svg = decodedUri;
            }
            if (opts.encode !== undefined) {
                isUriEncoded = opts.encode;
            }
        }

        if (!isSvg(svg)) {
            return;
        }

        promises.push(
            svgo.optimize(svg)
                .then(result => {
                    let data, optimizedValue;

                    if (isBase64) {
                        data = Buffer.from(result.data).toString('base64');
                        optimizedValue = 'data:image/svg+xml;base64,' + data;
                    } else {
                        data = isUriEncoded ? encode(result.data) : result.data;
                        // Should always encode # otherwise we yield a broken SVG
                        // in Firefox (works in Chrome however). See this issue:
                        // https://github.com/ben-eb/cssnano/issues/245
                        data = data.replace(/#/g, '%23');
                        optimizedValue = 'data:image/svg+xml;charset=utf-8,' + data;
                        quote = isUriEncoded ? '"' : '\'';
                    }

                    node.nodes[0] = Object.assign({}, node.nodes[0], {
                        value: optimizedValue,
                        quote: quote,
                        type: 'string',
                        before: '',
                        after: '',
                    });
                })
                .catch(error => {
                    throw new Error(`${PLUGIN}: ${error}`);
                })
        );

        return false;
    });

    return Promise.all(promises).then(() => (decl.value = decl.value.toString()));
}

export default postcss.plugin(PLUGIN, (opts = {}) => {
    const svgo = new SVGO(opts);
    return css => {
        return new Promise((resolve, reject) => {
            const promises = [];
            css.walkDecls(decl => {
                if (dataURI.test(decl.value)) {
                    promises.push(minifyPromise(svgo, decl, opts));
                }
            });
            return Promise.all(promises).then(resolve, reject);
        });
    };
});
