import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import bcdData from '@mdn/browser-compat-data' with { type: 'json' };
import committed from '../../../../src/merge/longhand/data/featureSupport.json' with { type: 'json' };
import { buildFeatureSupport } from '../lib/bcdFeatureSupport.js';
import {
  browserslistNames,
  lookup,
  standardSupportSince,
  supportOf,
} from '../lib/bcdSupport.js';
import { compareVersions } from '../../../../src/utils/versions.js';
import { requiredSupport } from '../../../../src/merge/longhand/isFallback.js';
import { mathFunctionNames } from '../../../../src/merge/longhand/mathType.js';
import { itemOf } from '../../../../test/merge/longhand/helpers/declarationItems.js';

describe('math function features', () => {
  test('cover every math function but calc() under the name requiredSupport gives it', () => {
    const missing = [...mathFunctionNames]
      .filter((name) => name !== 'calc')
      .flatMap((name) => [...requiredSupport(itemOf(`width: ${name}(1px)`))])
      .filter((feature) => !Object.hasOwn(committed, feature));
    assert.deepEqual(missing, []);
  });

  test('read the mixed-type subfeature, which is never earlier than the parent in any browser and later in some', () => {
    const failures = [];
    const features = buildFeatureSupport(bcdData);
    for (const name of ['round', 'mod', 'rem']) {
      const parent = supportOf(lookup(bcdData, `css.types.${name}`)) ?? {};
      const minimums = features.get(name) ?? new Map();
      assert.ok(minimums.size > 0, `${name} has no minimums`);
      const laterBrowsers = [];
      for (const [bcdName, browser] of browserslistNames) {
        const parentStatements = parent[bcdName];
        const parentSince =
          parentStatements && standardSupportSince(parentStatements);
        const childSince = minimums.get(browser);
        if (
          parentSince !== undefined &&
          childSince !== undefined &&
          compareVersions(childSince, parentSince) < 0
        ) {
          failures.push(`${name} in ${browser}`);
        }
        if (
          parentSince !== undefined &&
          childSince !== undefined &&
          compareVersions(childSince, parentSince) > 0
        ) {
          laterBrowsers.push(browser);
        }
      }
      assert.ok(
        laterBrowsers.length > 0,
        `${name}: no browser's mixed-type minimum is later than its parent`
      );
    }
    assert.deepEqual(failures, []);
  });
});
