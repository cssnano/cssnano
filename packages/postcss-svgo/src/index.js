'use strict';

import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import SVGO from 'svgo';
import isSvg from 'is-svg';

const dataURI = /data:image\/svg\+xml(;(charset=)?utf-8)?,/;
let encode = data => data
    .replace(/"/g,'\'')
    .replace(/</g,'%3C')
    .replace(/>/g,'%3E')
    .replace(/&/g,'%26')
    .replace(/#/g,'%23')
    .replace(/\s+/g,' ');
let decode = decodeURIComponent;

function minifyPromise (svgo, decl, opts) {
    var promises = [];

    decl.value = valueParser(decl.value).walk(node => {
        if (node.type !== 'function' || node.value !== 'url' || !node.nodes.length) {
            return;
        }
        let value = node.nodes[0].value;

        let decodedUri = decode(value);
        let isUriEncoded = decodedUri !== value;
        if (isUriEncoded) {
            value = decodedUri;
        }
        if (opts.encode !== undefined) {
            isUriEncoded = opts.encode;
        }

        if (!dataURI.test(value) || !isSvg(value)) {
            return;
        }
        promises.push(new Promise((resolve, reject) => {
            svgo.optimize(value.replace(dataURI, ''), result => {
                if (result.error) {
                    return reject(`Error parsing SVG: ${result.error}`);
                }
                node.before = node.after = '';
                let data = isUriEncoded ? encode(result.data) : result.data;
                node.nodes[0].value = 'data:image/svg+xml;charset=utf-8,' + data;
                node.nodes[0].quote = isUriEncoded ? '"' : '\'';
                node.nodes[0].type = 'string';
                resolve();
            });
        }));

        return false;
    });

    return Promise.all(promises).then(() => {
        decl.value = decl.value.toString();
    });
}

export default postcss.plugin('postcss-svgo', (opts = {}) => {
    let svgo = new SVGO(opts);
    return css => {
        return new Promise((resolve, reject) => {
            let promises = [];
            css.walkDecls(decl => {
                if (dataURI.test(decl.value)) {
                    promises.push(minifyPromise(svgo, decl, opts));
                }
            });
            Promise.all(promises).then(resolve, reject);
        });
    };
});
