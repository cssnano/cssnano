'use strict';

var test = require('ava');
var nano = require('../');
var file = require('fs').readFileSync;
var postcss = require('postcss');
var specName = require('./util/specName');
var formatter = require('./util/formatter');
var path = require('path');
var frameworks = require('css-frameworks');

var base = path.join(__dirname, 'integrations');

function formatted (css) {
    return postcss().use(nano()).use(formatter).process(css);
}

Object.keys(frameworks).forEach(function (framework) {
    var testName = 'produceTheExpectedResultFor: ' + framework + '.css';
    test(framework + '.css', function (t) {
        formatted(frameworks[framework]).then(function (result) {
            var expected = file(path.join(base, framework) + '.css', 'utf-8');
            t.same(result.css, expected, specName(testName));
        }, function (err) {
            t.notOk(err.stack);
        });
    });
});
