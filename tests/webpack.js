var test = require('tape');
var webpack = require('webpack');

var conf = {
    entry: {
        index: ".."
    },
    output: {
        path: "./output/",
        filename: "bundle.js"
    },
    module: {
        loaders: [{
            test: /\.json$/,
            loader: "json"
        }]
    },
    // because client side doesn't have fs :)
    node: {
        fs: "empty"
    }
};

test('cssnano should be consumed by webpack', function (t) {
    webpack(conf, function (err, stats) {
        if (err) {
            t.fail()
            throw err;
        }

        t.plan(2);
        t.notOk(stats.hasErrors(), "should not report any error");
        t.notOk(stats.hasWarnings(), "should not report any warning");
    });
});
