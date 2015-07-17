'use strict';

import replace from 'async-replace';
import SVGO from 'svgo';
import postcss from 'postcss';
import isSvg from 'is-svg';

const dataURI = /data:image\/svg\+xml(;(charset=)?utf-8)?,/;
let encode = encodeURIComponent;
let decode = decodeURIComponent;

function minifyPromise (svgo, decl) {
    return new Promise((resolve, reject) => {
        let isUriEncoded = decode(decl.value) !== decl.value;
        let minify = (_, quote, svg, offset, str, cb) => {
            if (!dataURI.test(svg) || !isSvg(svg)) {
                return cb(null, str);
            }
            if (typeof quote === 'undefined') { quote = ''; }
            svgo.optimize(svg.replace(dataURI, ''), (result) => {
                if (result.error) {
                    return reject(`Error parsing SVG: ${result.error}`);
                }
                let data = isUriEncoded ? encode(result.data) : result.data;
                let o = `url(${quote}data:image/svg+xml;utf-8,${data}${quote})`;
                return cb(null, o);
            });
        };
        replace(isUriEncoded ? decode(decl.value) : decl.value,
            /url\(("|')?(.*)\1\)/g, minify, (err, result) => {
            decl.value = result;
            resolve();
        });
    });
}

module.exports = postcss.plugin('postcss-svgo', opts => {
    let svgo = new SVGO(opts);
    return css => {
        return new Promise((resolve, reject) => {
            let promises = [];
            css.eachDecl(decl => {
                if (dataURI.test(decl.value)) {
                    promises.push(minifyPromise(svgo, decl));
                }
            });
            Promise.all(promises).then(resolve, reject);
        });
    };
});
