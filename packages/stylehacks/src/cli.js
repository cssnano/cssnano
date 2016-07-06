#!/usr/bin/env node

import fs from 'fs';
import read from 'read-file-stdin';
import write from 'write-file-stdout';
import minimist from 'minimist';
import {version} from '../package.json';
import stylehacks from './';

const opts = minimist(process.argv.slice(2), {
    alias: {
        b: 'browsers',
        l: 'lint',
        h: 'help',
        s: 'sourcemap',
        v: 'version',
    },
});

if (opts.version) {
    console.log(version);
} else {
    let file = opts._[0];
    let out  = opts._[1];

    if (file === 'help' || opts.help) {
        fs.createReadStream(__dirname + '/../usage.txt')
            .pipe(process.stdout)
            .on('close', () => process.exit(1));
    } else {
        read(file, (err, buf) => {
            if (err) {
                throw err;
            }
            if (file) {
                opts.from = file;
            }
            if (out) {
                opts.to = out;
            }
            stylehacks.process(String(buf), opts).then(result => {
                if (result.warnings().length) {
                    process.exit(1);
                }
                if (!opts.lint) {
                    write(result.css);
                }
            });
        });
    }
}
