/**
 * Regenerates src/data/longhands.json and shorthandIdentities.json from
 * @webref/css, and placeSupport.json from @mdn/browser-compat-data.
 *
 * Run with `npm run acquire` after bumping either pinned version, then
 * `pnpm fixlint` to reformat the generated file. Commit the result because
 * a data refresh has to go through the test suite.
 */
import { writeFileSync } from 'node:fs';
import css from '@webref/css';
import bcd from '@mdn/browser-compat-data' with { type: 'json' };

import { buildLonghands, serialize, validate } from './lib/webrefLonghands.js';
import {
  buildShorthandIdentities,
  serializeShorthandIdentities,
  validateShorthandIdentities,
} from './lib/webrefShorthandIdentities.js';
import {
  buildPlaceSupport,
  serializePlaceSupport,
  validatePlaceSupport,
} from './lib/bcdPlaceSupport.js';

const webref = await css.listAll();
const data = buildLonghands(webref);
validate(data);
const identities = buildShorthandIdentities(webref);
validateShorthandIdentities(identities);

const target = new URL('../src/data/longhands.json', import.meta.url);
writeFileSync(target, serialize(data));
const identitiesTarget = new URL(
  '../src/data/shorthandIdentities.json',
  import.meta.url
);
writeFileSync(identitiesTarget, serializeShorthandIdentities(identities));
const placeSupport = buildPlaceSupport(bcd);
validatePlaceSupport(placeSupport);
writeFileSync(
  new URL('../src/data/placeSupport.json', import.meta.url),
  serializePlaceSupport(placeSupport)
);

console.log(
  `Wrote ${data.shorthands.size} shorthands, ${data.initialValues.size} initial values, ` +
    `${data.borderProperties.length} border properties, ${data.namedColors.length} named colours ` +
    `${data.colorFunctions.length} colour functions, ${identities.alignment.size} alignment shorthands ` +
    `${identities.easing.functions.length} easing functions ` +
    `and place-* support for ${placeSupport.size} browsers.`
);
