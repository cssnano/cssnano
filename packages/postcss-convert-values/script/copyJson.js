/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const copyJson = (from, to) => {
  let json = fs.readFileSync(from, 'utf8');
  json = JSON.stringify(JSON.parse(json));
  fs.writeFile(to, json, 'utf8', (err) => {
    if (err) {
      return process.stderr.write(err);
    }
    console.log(`Copied ${from} -> ${to}`);
  });
};

const optionsPath = path.join(__dirname, '../src/options.json');
const destPath = path.join(__dirname, '../dist/options.json');
copyJson(optionsPath, destPath);
