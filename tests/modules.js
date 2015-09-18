'use strict';

var tape = require('tape');
var nano = require('../');
var path = require('path');

var directory = require('fs').readdirSync;
var base = path.join(__dirname, '/modules');

directory(base).forEach(function (file) {
    var module = require(path.join(base, file));
    tape(module.name, function (t) {
        t.plan(module.tests.length);

        module.tests.forEach(function (test) {
            var options = test.options || {};
            nano.process(test.fixture, options).then(function (result) {
                t.equal(result.css, test.expected, test.message);
            });
        });
    });
});
