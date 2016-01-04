'use strict';

var test = require('ava');
var nano = require('../');
var directory = require('fs').readdirSync;
var file = require('fs').readFileSync;
var specName = require('./util/specName');
var path = require('path');

var base = path.join(__dirname, 'fixtures');

var specs = directory(base).reduce(function (tests, cssFile) {
    var parts = cssFile.split('.');
    if (!tests[parts[0]]) {
        tests[parts[0]] = {};
    }
    tests[parts[0]][parts[1]] = file(path.join(base, cssFile), 'utf-8');
    return tests;
}, {});

Object.keys(specs).forEach(function (name) {
    var spec = specs[name];
    test(name, function (t) {
        nano.process(spec.fixture).then(function (result) {
            t.same(result.css, spec.expected, specName(name));
        });
    });
});
