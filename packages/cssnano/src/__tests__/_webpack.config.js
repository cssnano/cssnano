const path = require('path');

module.exports = {
    entry: {
        index: path.join(__dirname, '..'),
    },
    output: {
        path: path.resolve('./_webpackOutput/'),
        filename: 'bundle.js',
    },
    module: {
        rules: [{
            test: /\.js$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
        }],
    },
    // because client side doesn't have fs :)
    node: {
        fs: 'empty',
    },
};
