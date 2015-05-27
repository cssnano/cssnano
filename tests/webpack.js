var test = require('tape');
var webpack = require('webpack');
var assign = require('object-assign');

var conf = {
    output: {
        path: "./output/",
        filename: "bundle.js"
    },
    module: {
        loaders: [{
            test: /\.js$/,
            loader: "./index",
            exclude: /node_modules/
        }]
    }
};

test('cssnano should be consumed by webpack', function (t) {
    webpack(assign(conf, {entry: "../"}), function (err, stats) {
        t.plan(3);
        t.equal(err, null);
        t.notOk(stats.hasErrors());
        t.notOk(stats.hasWarnings());
    });
});
