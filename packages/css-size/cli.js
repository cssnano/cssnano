#!/usr/bin/env node

'use strict';

var fs = require('fs');
var read = require('read-file-stdin');
var size = require('.').table;

var opts = require('minimist')(process.argv.slice(2), {
    alias: {
        h: 'help',
        v: 'version'
    }
});

if (opts.version) {
    return console.log(require('./package.json').version);
}

var file = opts._[0];

if (file === 'help' || opts.help) {
    return fs.createReadStream(__dirname + '/usage.txt')
        .pipe(process.stdout)
        .on('close', function () {
            process.exit(1);
        });
}

read(file, function (err, buf) {
    if (err) {
        throw err;
    }
    size(buf).then(function (table) {
        console.log(table);
    });
});
