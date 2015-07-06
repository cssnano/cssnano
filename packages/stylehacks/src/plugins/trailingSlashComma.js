'use strict';

import plugin from '../plugin';

let hack = 'stylehacks-trailing-slash-comma';
let targets = ['ie 7', 'ie 6', 'ie 5.5'];

export default plugin(hack, targets, function () {
    this.css.eachRule(rule => {
        if (rule.selector) {
            var sel = rule.selector;
            if (sel.trim().lastIndexOf(',') === sel.length - 1 ||
                sel.trim().lastIndexOf('\\') === sel.length - 1) {
                this.push(rule, `Bad selector: ${sel}`);
            }
        }
    });
});
