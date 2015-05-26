'use strict';

var indexesOf = require('indexes-of');

module.exports = function eachCssFunction (decl, type, callback) {
    if (~decl.value.indexOf(type + '(')) {
        var locs = indexesOf(decl.value, type + '(');
        locs.push(decl.value.length);

        while (locs.length > 1) {
            var sub = decl.value.substring(locs[0], locs[1]);
            decl.value = decl.value.replace(sub, callback.call(this, sub));
            locs.shift();
        }
    }
};
