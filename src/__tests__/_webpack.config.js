const path = require('path');

module.exports = {
    entry: {
        index: path.join(__dirname, '..'),
    },
    output: {
        path: './_webpackOutput/',
        filename: 'bundle.js',
    },
    module: {
        loaders: [{
            test: /\.json$/,
            loader: 'json',
        }, {
            test: /\.js$/,
            loader: 'babel',
        }],
    },
    // because client side doesn't have fs :)
    node: {
        fs: 'empty',
    },
};
