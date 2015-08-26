'use strict';

var test = require('tape');
var nano = require('../');
var directory = require('fs').readdirSync;
var file = require('fs').readFileSync;
var specName = require('./util/specName');
var path = require('path');

var base = path.join(__dirname, 'fixtures');

test('fixture testing', function (t) {
    var specs = directory(base).reduce(function (tests, cssFile) {
        var parts = cssFile.split('.');
        if (!tests[parts[0]]) {
            tests[parts[0]] = {};
        }
        tests[parts[0]][parts[1]] = file(path.join(base, cssFile), 'utf-8');
        return tests;
    }, {});

    t.plan(Object.keys(specs).length);

    Object.keys(specs).forEach(function (name) {
        var spec = specs[name];
        nano.process(spec.fixture).then(function (result) {
            t.equal(result.css, spec.expected, specName(name));
        });
    });
});
