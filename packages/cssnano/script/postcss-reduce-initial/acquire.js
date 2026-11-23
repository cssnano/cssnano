/**
 * Builds fromInitial.json and toInitial.json from mdn-data. `script/acquire.js`
 * writes them, and `pnpm test` checks that the committed copies match.
 */
import data from 'mdn-data';
import { serializeJson } from '../../../../util/webref/webref.js';

import { reduceInitial, validate } from './lib/mdnCssProps.js';

/**
 * @return {{ files: Record<string, string>, summary: string }}
 */
export function acquire() {
  const grouped = reduceInitial(data.css.properties);
  applyKnownCorrections(grouped);

  if (!validate(grouped)) {
    throw new Error('the initial values from mdn-data failed validation');
  }

  return {
    files: {
      'src/plugins/postcss-reduce-initial/data/fromInitial.json': serializeJson(
        grouped['fromInitial']
      ),
      'src/plugins/postcss-reduce-initial/data/toInitial.json': serializeJson(
        grouped['toInitial']
      ),
    },
    summary:
      `${Object.keys(grouped['fromInitial']).length} initial values to keywords and ` +
      `${Object.keys(grouped['toInitial']).length} keywords to initial values`,
  };
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
