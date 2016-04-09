import ava from 'ava';
import path from 'path';
import webpack from 'webpack';

const conf = {
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

ava('cssnano should be consumed by webpack', t => {
    webpack(conf, (err, stats) => {
        if (err) {
            t.fail();
            throw err;
        }

        t.falsy(stats.hasErrors(), 'should not report any error');
        t.falsy(stats.hasWarnings(), 'should not report any warning');
    });
});
