'use strict';

var nano = require('../../');
var directory = require('fs').readdirSync;
var file = require('fs').readFileSync;
var write = require('fs').writeFileSync;
var postcss = require('postcss');
var formatter = require('./formatter');
var path = require('path');
var base = path.join(__dirname, '../integrations');

function formatted (css, cb) {
    return postcss([ nano(), formatter ]).process(css).then(function (res) {
        cb(res.css);
    });
}

directory(base).forEach(function (f) {
    if (~f.indexOf('fixture')) {
        formatted(file(base + '/' + f), function (res) {
            write(path.join(base, f.replace('fixture', 'expected')), res);
        });
    }
});
