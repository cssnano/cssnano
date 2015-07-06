'use strict';

import plugin from '../plugin';

let hack = 'stylehacks-leading-star';
let targets = ['ie 5.5', 'ie 6', 'ie 7'];

export default plugin(hack, targets, function () {
    this.css.eachDecl(decl => {
        if (!decl.before) {
            return;
        }
        let hacks = '!_$_&_*_)_=_%_+_,_._/_`_]_#_~_?_:_|'.split('_');
        let hasBefore = hacks.some(hack => {
            if (~decl.before.indexOf(hack)) {
                this.push(decl, `Bad property: ${decl.before.trim()}${decl.prop}`);
                return true;
            }
        });
        if (!hasBefore) {
            // some values are not picked up by before, so ensure they are
            // at the beginning of the value
            hacks.some(hack => {
                if (!decl.prop.indexOf(hack)) {
                    this.push(decl, `Bad property: ${decl.prop}`);
                    return true;
                }
            });
        }
    });
    this.css.eachAtRule(rule => {
        // test for the @property: value; hack
        if (rule.name.lastIndexOf(':') === rule.name.length - 1) {
            this.push(rule, `Bad property: @${rule.name.substr(0, rule.name.length - 1)}`);
        }
    });
});
