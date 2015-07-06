'use strict';

import plugin from '../plugin';

let hack = 'stylehacks-important';
let targets = ['ie 5.5', 'ie 6', 'ie 7'];

export default plugin(hack, targets, function () {
    this.css.eachDecl(decl => {
        let match = decl.value.match(/!\w/);
        if (match) {
            let text = decl.value.substr(match.index, decl.value.length - 1);
            this.push(decl, `Bad !important: ${text}`);
        }
    });
});
