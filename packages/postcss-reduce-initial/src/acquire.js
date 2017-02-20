import got from 'got';
import isHtml from 'is-html';
import plainText from 'html2plaintext';

const initialLength = 7; // "initial".length;
const url = 'https://raw.githubusercontent.com/mdn/data/master/css/properties.json';

got(url, {json:true})
    .then(({body}) => Object.keys(body)
        .reduce((values, key) => {
            let value;
            const {initial} = body[key];
            if (
                // Ignore complex syntaxes
                typeof initial === 'string' &&
                // Ignore display as it has different semantics
                // depending on the selected element.
                key !== 'display' &&
                // Ignore anything that doesn't look like <code></code>
                isHtml(initial) &&
                // Ignore if the word "initial" is shorter
                (value = plainText(initial)).length < initialLength
            ) {
                values[key] = value;
            }
            return values;
        }, {}))
    .then(
        data => process.stdout.write(`${JSON.stringify(data, null, 2)}\n`),
        error => console.warn('errored: ', error.response.body)
    );
