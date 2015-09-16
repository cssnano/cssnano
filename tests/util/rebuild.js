'use strict';

var nano = require('../../');
var directory = require('fs').readdirSync;
var file = require('fs').readFileSync;
var write = require('fs').writeFileSync;
var postcss = require('postcss');
var formatter = require('./formatter');
var path = require('path');
var base = path.join(__dirname, '../integrations');

directory(base).forEach(function (f) {
    if (~f.indexOf('fixture')) {
        postcss([nano(), formatter]).process(file(base + '/' + f)).then(function (res) {
            write(path.join(base, f.replace('fixture', 'expected')), res.css);
        });
    }
});
