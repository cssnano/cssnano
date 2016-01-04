'use strict';

var decamelize = require('decamelize');

function bracketize (num) {
    return ' (' + num + ')';
}

module.exports = function specName (testFile) {
    return 'should ' + decamelize(testFile, ' ').replace(/\d/g, bracketize);
};
