import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import SVGO from 'svgo';
import isSvg from 'is-svg';
import {encode, decode} from './lib/url';

const PLUGIN = 'postcss-svgo';
const dataURI = /data:image\/svg\+xml(;(charset=)?utf-8)?,/;

function minifyPromise (svgo, decl, opts) {
    const promises = [];

    decl.value = valueParser(decl.value).walk(node => {
        if (node.type !== 'function' || node.value !== 'url' || !node.nodes.length) {
            return;
        }
        let {value} = node.nodes[0];
        let decodedUri, isUriEncoded;

        try {
            decodedUri = decode(value);
            isUriEncoded = decodedUri !== value;
        } catch (e) {
            // Swallow exception if we cannot decode the value
            isUriEncoded = false;
        }

        if (isUriEncoded) {
            value = decodedUri;
        }
        if (opts.encode !== undefined) {
            isUriEncoded = opts.encode;
        }

        const svg = value.replace(dataURI, '');

        if (!isSvg(svg)) {
            return;
        }

        promises.push(new Promise((resolve, reject) => {
            return svgo.optimize(svg, result => {
                if (result.error) {
                    return reject(`${PLUGIN}: ${result.error}`);
                }
                let data = isUriEncoded ? encode(result.data) : result.data;
                // Should always encode # otherwise we yield a broken SVG
                // in Firefox (works in Chrome however). See this issue:
                // https://github.com/ben-eb/cssnano/issues/245
                data = data.replace(/#/g, '%23');
                node.nodes[0] = {
                    ...node.nodes[0],
                    value: 'data:image/svg+xml;charset=utf-8,' + data,
                    quote: isUriEncoded ? '"' : '\'',
                    type: 'string',
                    before: '',
                    after: '',
                };
                return resolve();
            });
        }));

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
