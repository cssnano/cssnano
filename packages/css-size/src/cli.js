#!/usr/bin/env node
import fs from 'fs';
import process from 'process';
import path from 'path';
import minimist from 'minimist';
import { table } from './';

const opts = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    v: 'version',
    p: 'processor',
  },
});

const processFile = (err, buf) => {
  if (err) {
    throw err;
  }
  if (buf.length === 0) {
    return;
  }
  let processor = null;
  if (opts.processor) {
    processor = require(path.resolve(process.cwd(), opts.processor));
  }
  table(buf, opts.options, processor).then((results) =>
    // eslint-disable-next-line no-console
    console.log(results)
  );
};

if (opts.version) {
  // eslint-disable-next-line no-console
  console.log(require('../package.json').version);
} else {
  let file = opts._[0];

  if (file === 'help' || opts.help) {
    fs.createReadStream(__dirname + '/../usage.txt')
      .pipe(process.stdout)
      .on('close', () => process.exit(1));
  } else if (file) {
    fs.readFile(file, processFile);
  } else {
    fs.readFile(process.stdin.fd, processFile);
  }
}
