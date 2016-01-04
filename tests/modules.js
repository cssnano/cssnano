'use strict';

var ava = require('ava');
var nano = require('../');
var path = require('path');

var directory = require('fs').readdirSync;
var base = path.join(__dirname, '/modules');

directory(base).forEach(function (file) {
    var module = require(path.join(base, file));
    module.tests.forEach(function (test) {
        ava(test.message, function (t) {
            var options = test.options || {};
            return nano.process(test.fixture, options).then(function (result) {
                t.same(result.css, test.expected);
            });
        });
    });
});
