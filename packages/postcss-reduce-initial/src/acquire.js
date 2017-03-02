import {join} from 'path';
import writeFile from 'write-file';
import got from 'got';
import isHtml from 'is-html';
import plainText from 'html2plaintext';

const initialLength = 7; // "initial".length;
const url = 'https://raw.githubusercontent.com/mdn/data/master/css/properties.json';

function err (error) {
    if (error) {
        throw error;
    }
}

function toJSON (data) {
    return `${JSON.stringify(data, null, 2)}\n`;
}

function writeFiles ({fromInitial, toInitial}) {
    writeFile(join(__dirname, '../data/fromInitial.json'), toJSON(fromInitial), err);
    writeFile(join(__dirname, '../data/toInitial.json'), toJSON(toInitial), err);
}

got(url, {json:true})
    .then(({body}) => Object.keys(body)
        .reduce((values, key) => {
            const {initial} = body[key];
            if (
                // Ignore complex syntaxes
                typeof initial === 'string' &&
                // Ignore display as it has different semantics
                // depending on the selected element.
                key !== 'display' &&
                // Ignore anything that doesn't look like <code></code>
                isHtml(initial)
            ) {
                const value = plainText(initial).trim();
                if (value.length < initialLength) {
                    values.fromInitial[key] = value;
                } else if (value.length > initialLength) {
                    values.toInitial[key] = value;
                }
            }
            return values;
        }, {fromInitial: {}, toInitial: {}}))
    .then(
        writeFiles,
        error => console.warn('errored: ', error.response.body)
    );
