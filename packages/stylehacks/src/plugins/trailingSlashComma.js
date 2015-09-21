'use strict';

import plugin from '../plugin';

let targets = ['ie 7', 'ie 6', 'ie 5.5'];

export default plugin(targets, ['rule'], function (rule) {
    if (rule.selector) {
        var sel = rule.selector;
        if (sel.trim().lastIndexOf(',') === sel.length - 1 ||
            sel.trim().lastIndexOf('\\') === sel.length - 1) {
            this.push(rule, `Bad selector: ${sel}`);
        }
    }
});
