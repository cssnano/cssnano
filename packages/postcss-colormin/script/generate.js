const path = require('path');
const writeFile = require('write-file');
const colorNames = require('css-color-names');
const toShorthand = require('../dist/lib/toShorthand');

const keywords = {};
const hexes = {};

Object.keys(colorNames).forEach((keyword) => {
  const hex = toShorthand(colorNames[keyword]);

  if (keyword.length < hex.length) {
    keywords[hex] = keyword;
    return;
  }

  hexes[keyword] = hex;
});

function stringify(map) {
  return JSON.stringify(map, null, 2) + '\n';
}

function callback(err) {
  if (err) {
    throw err;
  }
}

writeFile(
  path.join(__dirname, '../src/keywords.json'),
  stringify(keywords),
  callback
);

writeFile(
  path.join(__dirname, '../dist/keywords.json'),
  stringify(keywords),
  callback
);
