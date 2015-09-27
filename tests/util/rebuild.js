'use strict';

var nano = require('../../');
var write = require('fs').writeFileSync;
var postcss = require('postcss');
var formatter = require('./formatter');
var path = require('path');
var base = path.join(__dirname, '../integrations');

var frameworks = require('css-frameworks');

Object.keys(frameworks).forEach(function (f) {
    postcss([ nano(), formatter ]).process(frameworks[f]).then(function (res) {
        write(path.join(base, f + '.css'), res.css);
    });
});
