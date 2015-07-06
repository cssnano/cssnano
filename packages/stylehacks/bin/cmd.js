#!/usr/bin/env node

var fs = require('fs');
var stylehacks = require('../dist');
var read = require('read-file-stdin');
var write = require('write-file-stdout');

var opts = require('minimist')(process.argv.slice(2), {
    alias: {
        b: 'browsers',
        l: 'lint',
        h: 'help',
        s: 'sourcemap',
        v: 'version'
    }
});

if (opts.version) {
    return console.log(require('../package.json').version);
}

var file = opts._[0];
var out  = opts._[1];

if (file === 'help' || opts.help) {
    return fs.createReadStream(__dirname + '/usage.txt')
        .pipe(process.stdout)
        .on('close', function () { process.exit(1); });
}

read(file, function (err, buf) {
    if (err) {
        throw err;
    }
    if (file) {
        opts.from = file;
    }
    if (out) {
        opts.to = out;
    }
    stylehacks.process(String(buf), opts).then(function (result) {
        if (result.warnings().length) {
            process.exit(1);
        }
        if (!opts.lint) {
            write(result.css);
        }
    });
});
