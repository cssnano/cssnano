'use strict';

var fs = require('fs');
var suite = require('css-minifier-tests');
var tape = require('tape');

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
    tape('css minifier tests', function (t) {
        t.plan(testNames.length);

        testNames.forEach(function (test, index) {
            var result = results[index].cssnano.result;
            var name = test.replace(/^\d+ /, '');
            t.ok(result === 'outstanding' || result === 'optimal', name);
        });
    });
}

suite({
    tests: tests,
    minifiers: minifiers,
    onEnd: onEnd
});
