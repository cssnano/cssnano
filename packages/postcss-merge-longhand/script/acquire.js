/**
 * Regenerates src/data/longhands.json, shorthandIdentities.json,
 * numericRanges.json and knownProperties.json from @webref/css,
 * placeSupport.json and boxPropertySupport.json from
 * @mdn/browser-compat-data, featureSupport.json from
 * @mdn/browser-compat-data tightened by caniuse-lite, and
 * flowRelativeSides.json from the writing mode mappings.
 *
 * Run with `pnpm run acquire` after bumping @webref/css,
 * @mdn/browser-compat-data or caniuse-lite, then
 * `pnpm fixlint` to reformat the generated files. Commit the result because
 * a data refresh has to go through the test suite.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import css from '@webref/css';
import { serializeJson } from '../../../util/webref/webref.js';
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
import {
  buildBoxPropertySupport,
  serializeBoxPropertySupport,
  validateBoxPropertySupport,
} from './lib/bcdBoxSupport.js';
import {
  buildFlowRelativeSides,
  serializeFlowRelativeSides,
} from './lib/writingModes.js';
import {
  buildFeatureSupport,
  serializeFeatureSupport,
  tightenWithCaniuse,
  validateFeatureSupport,
} from './lib/bcdFeatureSupport.js';
import {
  knownProperties,
  numericRangeProperties,
  validateNumericRanges,
} from './lib/webrefNumericRanges.js';

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
const boxShorthandLonghands = new Map(
  [...data.boxGroups].flatMap(([group, { axisShorthands }]) =>
    [group, ...axisShorthands].map((name) => [
      name,
      /** @type {{ longhands: string[] }} */ (data.shorthands.get(name))
        .longhands,
    ])
  )
);
const boxSupport = buildBoxPropertySupport(bcd, boxShorthandLonghands);
validateBoxPropertySupport(boxSupport, bcd);
writeFileSync(
  new URL('../src/data/boxPropertySupport.json', import.meta.url),
  serializeBoxPropertySupport(boxSupport)
);
writeFileSync(
  new URL('../src/data/flowRelativeSides.json', import.meta.url),
  serializeFlowRelativeSides(buildFlowRelativeSides())
);
const numericRanges = numericRangeProperties(webref);
validateNumericRanges(numericRanges);
writeFileSync(
  new URL('../src/data/numericRanges.json', import.meta.url),
  serializeJson(numericRanges)
);
const known = knownProperties(webref);
writeFileSync(
  new URL('../src/data/knownProperties.json', import.meta.url),
  serializeJson(known)
);
// The caniuse-lite that browserslist resolves targets with.
const caniuse = createRequire(
  fileURLToPath(import.meta.resolve('browserslist'))
)('caniuse-lite');
const featureSupport = tightenWithCaniuse(
  buildFeatureSupport(bcd),
  (id) => caniuse.feature(caniuse.features[id]).stats
);
validateFeatureSupport(featureSupport);
writeFileSync(
  new URL('../src/data/featureSupport.json', import.meta.url),
  serializeFeatureSupport(featureSupport)
);

console.log(
  `Wrote ${data.shorthands.size} shorthands, ${data.initialValues.size} initial values, ` +
    `${data.borderProperties.length} border properties, ${data.namedColors.length} named colours ` +
    `${data.colorFunctions.length} colour functions, ${identities.alignment.size} alignment shorthands ` +
    `${identities.easing.functions.length} easing functions ` +
    `place-* support for ${placeSupport.size} browsers ` +
    `support for ${boxSupport.size} box properties ` +
    `and support for ${featureSupport.size} newer features.`
);
