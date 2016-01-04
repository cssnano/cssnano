'use strict';

var fs = require('fs');
var suite = require('css-minifier-tests');
var ava = require('ava');

var minifiers = {
    cssnano: function (css) {
        return new Promise(function (resolve, reject) {
            return require('..').process(css).then(function (result) {
                resolve(result.css);
            }, function (err) {
                reject(err);
            });
        });
    }
};

var tests = fs.readdirSync(__dirname + '/../node_modules/css-minifier-tests/tests').map(function (dir) {
    return __dirname + '/../node_modules/css-minifier-tests/tests/' + dir;
});

function onEnd (results, testNames) {
    testNames.forEach(function (test, index) {
        ava(test.replace(/^\d+ /, ''), function (t) {
            var result = results[index].cssnano.result;
            t.ok(result === 'outstanding' || result === 'optimal');
        });
    });
}

suite({
    tests: tests,
    minifiers: minifiers,
    onEnd: onEnd
});
