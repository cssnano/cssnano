import got from 'got';
import cheerio from 'cheerio';
import isHtml from 'is-html';
import plainText from 'html2plaintext';

const initialLength = 7;
const url = 'https://developer.mozilla.org/en-US/docs/Template:CSSData';

got(url).then(({body}) => {
    const $ = cheerio.load(body);

    const result = $('#wikiArticle pre').text().replace(/[\r\t]/g, '');
    const data = JSON.parse(result);

    const initialValues = Object.keys(data.properties).reduce((values, key) => {
        const property = data.properties[key];

        if (
            // Ignore complex syntaxes
            typeof property.initial !== 'string' ||
            // Ignore display as it has different semantics
            // depending on the selected element. 
            key === 'display' ||
            // Ignore anything that doesn't look like <code></code>
            !isHtml(property.initial)
        ) {
            return values;
        }

        const value = plainText(property.initial);
        if (value.length < initialLength) {
            values[key] = value;
        }
        return values;
    }, {});

    process.stdout.write(`${JSON.stringify(initialValues, null, 2)}\n`);
}).catch(error => console.log('errored: ', error.response.body));
