import path from 'path';
import writeFile from 'write-file';
import colorNames from 'css-color-names';
import toShorthand from './lib/toShorthand';

const keywords = {};
const hexes = {};

Object.keys(colorNames).forEach(keyword => {
    const hex = toShorthand(colorNames[keyword]);
    if (keyword.length < hex.length) {
        keywords[hex] = keyword;
        return;
    }
    hexes[keyword] = hex;
});

function stringify (map) {
    return JSON.stringify(map, null, 2) + '\n';
}

function callback (err) {
    if (err) {
        throw err;
    }
}

writeFile(
    path.join(__dirname, 'keywords.json'),
    stringify(keywords),
    callback
);

writeFile(
    path.join(__dirname, '../dist/keywords.json'),
    stringify(keywords),
    callback
);
