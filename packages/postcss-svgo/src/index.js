'use strict';

import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import SVGO from 'svgo';
import isSvg from 'is-svg';

const dataURI = /data:image\/svg\+xml(;(charset=)?utf-8)?,/;
let encode = encodeURIComponent;
let decode = decodeURIComponent;

function minifyPromise (svgo, decl) {
    var promises = [];

    decl.value = valueParser(decl.value).walk(node => {
        if (node.type !== 'function' || node.value !== 'url' || !node.nodes.length) {
            return;
        }
        let value = node.nodes[0].value;
        let isUriEncoded;
        try {
            let encodedUri = decode(value);
            isUriEncoded = encodedUri !== value;
            if (isUriEncoded) {
                value = encodedUri;
            }
        } catch (err) {
            isUriEncoded = false;
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
                if (node.nodes[0].type === 'string') {
                    node.nodes[0].quote = '\'';
                }
                resolve();
            });
        }));

        return false;
    });

    return Promise.all(promises).then(() => {
        decl.value = decl.value.toString();
    });
}

module.exports = postcss.plugin('postcss-svgo', opts => {
    let svgo = new SVGO(opts);
    return css => {
        return new Promise((resolve, reject) => {
            let promises = [];
            css.walkDecls(decl => {
                if (dataURI.test(decl.value)) {
                    promises.push(minifyPromise(svgo, decl));
                }
            });
            Promise.all(promises).then(resolve, reject);
        });
    };
});
