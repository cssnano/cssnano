'use strict';

var test = require('ava');
var webpack = require('webpack');
var path = require('path');

var conf = {
    entry: {
        index: path.join(__dirname, '..')
    },
    output: {
        path: './output/',
        filename: 'bundle.js'
    },
    module: {
        loaders: [{
            test: /\.json$/,
            loader: 'json'
        }]
    },
    // because client side doesn't have fs :)
    node: {
        fs: 'empty'
    }
};

test('cssnano should be consumed by webpack', function (t) {
    webpack(conf, function (err, stats) {
        if (err) {
            t.fail();
            throw err;
        }

        t.notOk(stats.hasErrors(), 'should not report any error');
        t.notOk(stats.hasWarnings(), 'should not report any warning');
    });
});
