'use strict';

import plugin from '../plugin';

let hack = 'stylehacks-media-slash9';
let targets = ['ie 5.5', 'ie 6', 'ie 7'];

export default plugin(hack, targets, function () {
    this.css.eachAtRule('media', rule => {
        var params = rule.params.trim();
        if (params === 'screen\\9') {
            this.push(rule, `Bad media query: ${params}`);
        }
    });
});
