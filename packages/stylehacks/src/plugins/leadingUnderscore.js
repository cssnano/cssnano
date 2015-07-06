'use strict';

import plugin from '../plugin';

let hack = 'stylehacks-leading-underscore';
let targets = ['ie 6'];

export default plugin(hack, targets, function () {
    this.css.eachDecl(decl => {
        if (!decl.before) {
            return;
        }
        if (~decl.before.indexOf('_') || ~decl.before.indexOf('-')) {
            this.push(decl, `Bad property: ${decl.before.trim()}${decl.prop}`);
        }
    });
});
