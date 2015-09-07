'use strict';

import plugin from '../plugin';

let hack = 'stylehacks-media-slash0';
let targets = ['ie 8'];

export default plugin(hack, targets, function () {
    this.css.walkAtRules('media', rule => {
        var params = rule.params.trim();
        if (params === '\\0screen') {
            this.push(rule, `Bad media query: ${params}`);
        }
    });
});
