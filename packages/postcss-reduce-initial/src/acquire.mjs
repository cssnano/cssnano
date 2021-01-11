import { join } from 'path';
import writeFile from 'write-file';
import got from 'got';
import plainText from 'html2plaintext';

const initialLength = 7; // "initial".length;
const url =
  'https://raw.githubusercontent.com/mdn/data/master/css/properties.json';

function err(error) {
  if (error) {
    throw error;
  }
}

function toJSON(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

function writeFiles({ fromInitial, toInitial }) {
  writeFile(
    join(__dirname, '../data/fromInitial.json'),
    toJSON(fromInitial),
    err
  );
  writeFile(join(__dirname, '../data/toInitial.json'), toJSON(toInitial), err);
}

got(url, { responseType: 'json' })
  .then(({ body }) =>
    Object.keys(body).reduce(
      (values, key) => {
        const { initial, status } = body[key];
        if (
          // Ignore complex syntaxes
          typeof initial === 'string' &&
          key !== '--*' &&
          // Ignore display as it has different semantics
          // depending on the selected element.
          key !== 'display' &&
          // Ignore properties depend on user-agent implementation
          initial !== 'dependsOnUserAgent' &&
          initial !== 'noPracticalInitialValue' &&
          initial !== 'noneButOverriddenInUserAgentCSS' &&
          initial !== 'variesFromBrowserToBrowser' &&
          initial !== 'invertOrCurrentColor' &&
          initial !== 'startOrNamelessValueIfLTRRightIfRTL' &&
          initial !== 'autoForSmartphoneBrowsersSupportingInflation' &&
          // Skip non standard properties, because they can change behaviour at any time
          status !== 'nonstandard'
        ) {
          const value = plainText(initial).trim();
          if (value.length < initialLength) {
            values.fromInitial[key] = value;
          } else if (value.length > initialLength) {
            values.toInitial[key] = value;
          }
        }
        return values;
      },
      { fromInitial: {}, toInitial: {} }
    )
  )
  // eslint-disable-next-line no-console
  .then(writeFiles, (error) => console.warn('errored: ', error.response.body));
