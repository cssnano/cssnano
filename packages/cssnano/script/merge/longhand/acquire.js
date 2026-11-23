/**
 * Builds data/longhands.json, shorthandIdentities.json, numericRanges.json and
 * knownProperties.json from @webref/css, placeSupport.json, pairSupport.json
 * and boxPropertySupport.json from @mdn/browser-compat-data,
 * featureSupport.json from @mdn/browser-compat-data tightened by caniuse-lite,
 * and flowRelativeSides.json from the writing mode mappings.
 * `script/acquire.js` writes them, and `pnpm test` checks that the committed
 * copies match.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serializeJson } from '../../../../../util/webref/webref.js';
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
  buildPairSupport,
  serializePairSupport,
  validatePairSupport,
} from './lib/bcdPairSupport.js';
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

const DATA = 'src/merge/longhand/data';

/**
 * @param {{ webref: any }} inputs
 * @return {{ files: Record<string, string>, summary: string }}
 */
export function acquire({ webref }) {
  const data = buildLonghands(webref);
  validate(data);
  const identities = buildShorthandIdentities(webref);
  validateShorthandIdentities(identities);

  const placeSupport = buildPlaceSupport(bcd);
  validatePlaceSupport(placeSupport, bcd);
  const pairSupport = buildPairSupport(bcd);
  validatePairSupport(pairSupport);
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
  const numericRanges = numericRangeProperties(webref);
  validateNumericRanges(numericRanges);
  // The caniuse-lite that browserslist resolves targets with.
  const caniuse = createRequire(
    fileURLToPath(import.meta.resolve('browserslist'))
  )('caniuse-lite');
  const featureSupport = tightenWithCaniuse(
    buildFeatureSupport(bcd),
    (id) => caniuse.feature(caniuse.features[id]).stats
  );
  validateFeatureSupport(featureSupport);

  return {
    files: {
      'src/ir/data/longhands.json': serialize(data),
      [`${DATA}/shorthandIdentities.json`]:
        serializeShorthandIdentities(identities),
      [`${DATA}/placeSupport.json`]: serializePlaceSupport(placeSupport),
      [`${DATA}/pairSupport.json`]: serializePairSupport(pairSupport),
      [`${DATA}/boxPropertySupport.json`]:
        serializeBoxPropertySupport(boxSupport),
      [`${DATA}/flowRelativeSides.json`]: serializeFlowRelativeSides(
        buildFlowRelativeSides()
      ),
      [`${DATA}/numericRanges.json`]: serializeJson(numericRanges),
      [`${DATA}/knownProperties.json`]: serializeJson(knownProperties(webref)),
      [`${DATA}/featureSupport.json`]: serializeFeatureSupport(featureSupport),
    },
    summary:
      `${data.shorthands.size} shorthands, ${data.initialValues.size} initial values, ` +
      `${data.borderProperties.length} border properties, ${data.namedColors.length} named colours ` +
      `${data.colorFunctions.length} colour functions, ${identities.alignment.size} alignment shorthands ` +
      `${identities.easing.functions.length} easing functions ` +
      `place-* support for ${placeSupport.size} browsers ` +
      `support for ${boxSupport.size} box properties ` +
      `and support for ${featureSupport.size} newer features`,
  };
}
