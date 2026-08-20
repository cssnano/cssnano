import { writeFile } from 'node:fs';
import data from 'mdn-data';

import { reduceInitial, validate } from './lib/mdnCssProps.mjs';

const cssProperties = data.css.properties;

const grouped = reduceInitial(cssProperties);
applyKnownCorrections(grouped);

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

function applyKnownCorrections(groupedData) {
  // MDN describes this prefixed property as having an initial value of `none`,
  // but browsers do not consistently support that value yet.
  delete groupedData.fromInitial['-webkit-line-clamp'];

  // Keep the shorthand entry until all supported browsers expose its
  // individual logical longhands consistently.
  groupedData.toInitial['border-block-color'] = 'currentcolor';

  // MDN lists this SVG property, but the value is not reliably supported by
  // the browser versions covered by this plugin.
  delete groupedData.toInitial['color-interpolation-filters'];

  groupedData.toInitial = Object.fromEntries(
    Object.entries(groupedData.toInitial).toSorted(([a], [b]) =>
      a.localeCompare(b)
    )
  );
}
