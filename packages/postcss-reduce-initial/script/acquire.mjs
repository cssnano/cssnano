import { writeFile } from 'node:fs';
import data from 'mdn-data';

import { reduceInitial } from './lib/mdnCssProps.mjs';

const cssProperties = data.css.properties;

const grouped = reduceInitial(cssProperties);

if (
  grouped !== undefined &&
  Object.keys(grouped.fromInitial || {}).length &&
  Object.keys(grouped.toInitial || {}).length
) {
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

function toJSONString(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}
