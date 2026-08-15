import { writeFile } from 'node:fs';
import data from 'mdn-data';

import { reduceInitial, validate } from './lib/mdnCssProps.mjs';

const cssProperties = data.css.properties;

const grouped = reduceInitial(cssProperties);

if (validate(grouped)) {
  writeFile(
    new URL('../src/data/fromInitial.json', import.meta.url),
    toJSONString(grouped['fromInitial']),
    handleError
  );
  writeFile(
    new URL('../src/data/toInitial.json', import.meta.url),
    toJSONString(grouped['toInitial']),
    handleError
  );
}
export function handleError(error) {
  if (error) {
    throw error;
  }
}

function toJSONString(obj) {
  return `${JSON.stringify(obj, null, 2)}\n`;
}
