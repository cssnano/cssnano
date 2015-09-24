'use strict';

import postcss from 'postcss';
import parser from 'postcss-value-parser';
import SVGO from 'svgo';
import isSvg from 'is-svg';

const dataURI = /data:image\/svg\+xml(;(charset=)?utf-8)?,/;
let encode = encodeURIComponent;
let decode = decodeURIComponent;

function minifyPromise (svgo, decl) {
    var promises = [];

    decl.value = parser(decl.value).walk(function (node) {
        if (node.type === 'function' && node.value === 'url' && node.nodes.length) {
            parser.trim(node.nodes);
            let quote = node.nodes[0].quote;
            if (typeof quote === 'undefined') {
                quote = '';
            } else if (quote === '"') {
                quote = "'";
            }
            let lastType = node.nodes[0].type;
            node.nodes[0].type = 'word';
            let value = parser.stringify(node.nodes);
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
                node.nodes[0].type = lastType;
                return;
            }
            promises.push(new Promise((resolve, reject) => {
                svgo.optimize(value.replace(dataURI, ''), result => {
                    if (result.error) {
                        return reject(`Error parsing SVG: ${result.error}`);
                    }
                    let data = isUriEncoded ? encode(result.data) : result.data;
                    node.nodes = [{
                        type: 'string',
                        quote,
                        value: 'data:image/svg+xml;charset=utf-8,' + data
                    }];
                    resolve();
                });
            }))
        }
    });

    return Promise.all(promises).then(function () {
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
