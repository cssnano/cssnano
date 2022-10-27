'use strict';
/* eslint-disable no-console */

const { writeFile } = require('fs');
const { resolve } = require('path');

const listTypeURL =
  'https://raw.githubusercontent.com/mdn/browser-compat-data/master/css/properties/list-style-type.json';

(async () => {
  const response = await fetch(listTypeURL);
  const body = await response.json();

  const data = Object.keys(body.css.properties['list-style-type']).slice(1);
  const content = {
    'list-style-type': data,
  };
  writeFile(
    resolve(__dirname, '../src/rules/listStyleTypes.json'),
    JSON.stringify(content, null, 2),
    (err) => {
      if (err) {
        console.log('Error while fetch list style type from GitHub', err);
        process.exit(1);
      }
    }
  );
})();
