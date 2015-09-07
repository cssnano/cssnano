'use strict';

import plugin from '../plugin';

let hack = 'stylehacks-leading-underscore';
let targets = ['ie 6'];

export default plugin(hack, targets, function () {
    this.css.walkDecls(decl => {
        let before = decl.raws.before;
        if (!before) {
            return;
        }
        if (~before.indexOf('_') || ~before.indexOf('-')) {
            this.push(decl, `Bad property: ${before.trim()}${decl.prop}`);
        }
    });
});
