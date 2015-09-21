'use strict';

import plugin from '../plugin';

let targets = ['ie 5.5', 'ie 6', 'ie 7'];

export default plugin(targets, ['decl'], function (decl) {
    let match = decl.value.match(/!\w/);
    if (match) {
        let text = decl.value.substr(match.index, decl.value.length - 1);
        this.push(decl, `Bad !important: ${text}`);
    }
});
