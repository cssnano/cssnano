#!/usr/bin/env node

import fs from 'fs';
import read from 'read-file-stdin';
import minimist from 'minimist';
import {table} from './';

const opts = minimist(process.argv.slice(2), {
    alias: {
        h: 'help',
        v: 'version',
    },
});

if (opts.version) {
    console.log(require('../package.json').version);
} else {
    let file = opts._[0];

    if (file === 'help' || opts.help) {
        fs.createReadStream(__dirname + '/../usage.txt')
            .pipe(process.stdout)
            .on('close', () => process.exit(1));
    } else {
        read(file, (err, buf) => {
            if (err) {
                throw err;
            }
            table(buf, opts.options).then((results) => console.log(results));
        });
    }
}
