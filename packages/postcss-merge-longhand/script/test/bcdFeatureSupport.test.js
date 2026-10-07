import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import browserslist from 'browserslist';
import bcdData from '@mdn/browser-compat-data' with { type: 'json' };
import committed from '../../src/data/featureSupport.json' with { type: 'json' };
import cssnanoUtils from 'cssnano-utils';
import {
  buildFeatureSupport,
  caniuseFeatureIds,
  featureBcdPaths,
  longstandingFloor,
  longstandingFunctionBcdPaths,
  longstandingUnitBcdPaths,
  reconcileMinimum,
  serializeFeatureSupport,
  tightenWithCaniuse,
} from '../lib/bcdFeatureSupport.js';
import { lookup, standardSupportSince, supportOf } from '../lib/bcdSupport.js';
import { compareVersions } from '../../src/lib/compareVersions.js';
import {
  longstandingFunctions,
  longstandingUnits,
} from '../../src/lib/syntaxFeatures.js';

/* caniuse-lite is the browserslist dependency, so it is the data the
 * targets themselves come from. */
const caniuse = createRequire(
  fileURLToPath(import.meta.resolve('browserslist'))
)('caniuse-lite');

/** @param {string} id @return {Record<string, Record<string, string>>} */
const caniuseStats = (id) => caniuse.feature(caniuse.features[id]).stats;

/**
 * @param {Record<string, object | object[]>} support
 * @return {object} BCD data holding only the dynamic viewport units
 */
function bcd(support) {
  return {
    css: {
      types: {
        length: {
          viewport_percentage_units_dynamic: { __compat: { support } },
        },
      },
    },
  };
}

/**
 * @param {Record<string, object | object[]>} support
 * @param {string} browser
 * @return {string | undefined}
 */
function dvhMinimum(support, browser) {
  return buildFeatureSupport(bcd(support)).get('unit:dvh')?.get(browser);
}

/**
 * @param {Iterable<[string, string]>} bcdPaths feature name and its BCD path
 * @param {(name: string) => string} label
 * @return {string[]} each feature a browser at the support floor does not parse
 */
function unsupportedAtFloor(bcdPaths, label) {
  const failures = [];
  for (const [name, path] of bcdPaths) {
    const support = supportOf(lookup(bcdData, path)) ?? {};
    for (const [browser, floor] of longstandingFloor) {
      const statements = support[browser];
      const since = statements && standardSupportSince(statements);
      if (since === undefined || compareVersions(since, floor) > 0) {
        failures.push(`${label(name)} in ${browser} ${floor}`);
      }
    }
  }
  return failures;
}

describe('buildFeatureSupport', () => {
  test('keys minimums by browserslist name', () => {
    assert.equal(
      dvhMinimum({ safari_ios: { version_added: '15.4' } }, 'ios_saf'),
      '15.4'
    );
  });

  test('omits support that is only behind a flag', () => {
    assert.equal(
      dvhMinimum(
        { chrome: { version_added: '90', flags: [{ type: 'preference' }] } },
        'chrome'
      ),
      undefined
    );
  });

  test('omits prefixed support', () => {
    assert.equal(
      dvhMinimum(
        { chrome: { version_added: '90', prefix: '-webkit-' } },
        'chrome'
      ),
      undefined
    );
  });

  test('omits partial implementations', () => {
    assert.equal(
      dvhMinimum(
        { chrome: { version_added: '90', partial_implementation: true } },
        'chrome'
      ),
      undefined
    );
  });

  test('omits support that was later removed', () => {
    assert.equal(
      dvhMinimum(
        { chrome: { version_added: '90', version_removed: '100' } },
        'chrome'
      ),
      undefined
    );
  });

  test('uses the upper bound of a ranged version', () => {
    assert.equal(dvhMinimum({ edge: { version_added: '≤79' } }, 'edge'), '79');
  });

  test('records a feature BCD lacks with no browsers', () => {
    assert.equal(buildFeatureSupport(bcd({})).get('unit:svh')?.size, 0);
  });
});

describe('committed feature support data', () => {
  test('covers exactly the features the generator maps to BCD', () => {
    assert.deepEqual(
      Object.keys(committed).toSorted(),
      [...featureBcdPaths.keys()].toSorted()
    );
  });

  test('maps only newer units, keywords, alpha hex and calc(), which Opera Mini lacks', () => {
    for (const feature of featureBcdPaths.keys()) {
      assert.match(
        feature,
        /^(?:unit:[a-z]+|keyword:[a-z\-]+|hex-alpha|calc)$/v
      );
    }
  });

  test('names only browsers that browserslist knows', () => {
    const known = new Set(Object.keys(browserslist.data));
    for (const minimums of Object.values(committed)) {
      assert.deepEqual(
        Object.keys(minimums).filter((name) => !known.has(name)),
        []
      );
    }
  });

  test('records each minimum as a plain dotted version', () => {
    for (const minimums of Object.values(committed)) {
      for (const version of Object.values(minimums)) {
        assert.match(version, /^\d+(?:\.\d+)*$/v);
      }
    }
  });

  test('requires a release of each engine that browserslist has already shipped', () => {
    for (const minimums of Object.values(committed)) {
      for (const [name, version] of Object.entries(minimums)) {
        const released = browserslist.data[name].released;
        assert.ok(
          released.some((r) => compareVersions(r.split('-')[0], version) >= 0),
          name
        );
      }
    }
  });

  test('matches the pinned browser compatibility data, so a bump needs a regenerate', () => {
    assert.deepEqual(
      JSON.parse(
        serializeFeatureSupport(
          tightenWithCaniuse(buildFeatureSupport(bcdData), caniuseStats)
        )
      ),
      committed
    );
  });
});

describe('longstanding units', () => {
  /** @type {Set<string>} */
  const trackedUnits = new Set(
    [...featureBcdPaths.keys()]
      .filter((feature) => feature.startsWith('unit:'))
      .map((feature) => feature.slice('unit:'.length))
  );

  test('are disjoint from the tracked unit features', () => {
    assert.deepEqual(
      [...longstandingUnits].filter((unit) => trackedUnits.has(unit)),
      []
    );
  });

  test('together with the tracked units cover every length unit', () => {
    const covered = new Set([...longstandingUnits, ...trackedUnits]);
    assert.deepEqual(
      [...cssnanoUtils.lengthUnits].filter((unit) => !covered.has(unit)),
      []
    );
  });

  test('have a BCD path each', () => {
    assert.deepEqual(
      [...longstandingUnits].filter(
        (unit) => !longstandingUnitBcdPaths.has(unit)
      ),
      []
    );
  });

  test('exclude every unit of a caniuse feature that Opera Mini lacks', () => {
    // Opera Mini has no BCD data, so caniuse-lite, the browserslist
    // dependency, is the independent source for its support.
    /** @type {Map<string, string[]>} */
    const unitsByFeature = new Map([
      ['viewport-units', ['vw', 'vh', 'vmin', 'vmax']],
      ['ch-unit', ['ch']],
      ['rem', ['rem']],
    ]);
    const unsupported = [...unitsByFeature].filter(
      ([feature]) =>
        caniuse.feature(caniuse.features[feature]).stats.op_mini.all !== 'y'
    );
    assert.ok(unsupported.length > 0);
    assert.deepEqual(
      unsupported
        .flatMap(([, units]) => units)
        .filter((unit) => longstandingUnits.has(unit)),
      []
    );
  });

  test('are parsed by every browser at the support floor', () => {
    assert.deepEqual(
      unsupportedAtFloor(longstandingUnitBcdPaths, (unit) => unit),
      []
    );
  });
});

describe('longstanding functions', () => {
  test('have a BCD path each', () => {
    assert.deepEqual(
      [...longstandingFunctions].filter(
        (name) => !longstandingFunctionBcdPaths.has(name)
      ),
      []
    );
  });

  test('list no function the plugin does not', () => {
    assert.deepEqual(
      [...longstandingFunctionBcdPaths.keys()].filter(
        (name) => !longstandingFunctions.has(name)
      ),
      []
    );
  });

  test('are parsed by every browser at the support floor', () => {
    assert.deepEqual(
      unsupportedAtFloor(longstandingFunctionBcdPaths, (name) => `${name}()`),
      []
    );
  });
});

describe('reconcileMinimum', () => {
  test('raises the minimum past a release caniuse records without support', () => {
    assert.equal(
      reconcileMinimum('9.3', { 9.3: 'n', '10.0-10.2': 'y' }),
      '10.0'
    );
  });

  test('keeps the minimum when every release caniuse records without support predates it', () => {
    assert.equal(
      reconcileMinimum('62', { '4.4.3-4.4.4': 'n', 154: 'y' }),
      '62'
    );
  });

  test('keeps the minimum when caniuse records only supporting releases', () => {
    assert.equal(reconcileMinimum('62', { 154: 'y' }), '62');
  });

  test('compares the minimum with the last release of a range', () => {
    assert.equal(reconcileMinimum('9.1', { '9.0-9.2': 'n', 9.3: 'y' }), '9.3');
  });

  test('counts partial support as lacking', () => {
    assert.equal(reconcileMinimum('7', { 7: 'a #1', 8: 'y' }), '8');
  });

  test('counts support with notes as full', () => {
    assert.equal(reconcileMinimum('8', { 7: 'n', 8: 'y #2' }), '8');
  });

  test('starts after the last release that lacks support', () => {
    assert.equal(reconcileMinimum('5', { 5: 'y', 6: 'n', 7: 'y' }), '7');
  });

  test('orders versions numerically, not as strings', () => {
    assert.equal(reconcileMinimum('9', { 10: 'y', 9: 'n', 9.1: 'y' }), '9.1');
  });

  test('returns nothing when the latest release lacks support', () => {
    assert.equal(reconcileMinimum('7', { 7: 'y', 8: 'n' }), undefined);
  });

  test('returns nothing without a plain version, such as Opera Mini all', () => {
    assert.equal(reconcileMinimum('1', { all: 'y' }), undefined);
  });
});

/**
 * @param {Record<string, string>} bcdMinimums
 * @param {Record<string, Record<string, string>>} stats
 * @return {Map<string, string> | undefined}
 */
function tightenAlphaHex(bcdMinimums, stats) {
  const features = new Map([
    ['hex-alpha', new Map(Object.entries(bcdMinimums))],
  ]);
  return tightenWithCaniuse(features, () => stats).get('hex-alpha');
}

describe('tightenWithCaniuse', () => {
  test('keeps the later minimum when caniuse records later support', () => {
    assert.equal(
      tightenAlphaHex(
        { ios_saf: '9.3' },
        { ios_saf: { 9.3: 'n', '10.0-10.2': 'y' } }
      )?.get('ios_saf'),
      '10.0'
    );
  });

  test('keeps the later minimum when browser-compat-data records later support', () => {
    assert.equal(
      tightenAlphaHex({ safari: '10' }, { safari: { 8: 'n', 9: 'y' } })?.get(
        'safari'
      ),
      '10'
    );
  });

  test('drops a browser caniuse records without full support', () => {
    assert.equal(
      tightenAlphaHex({ ie: '11' }, { ie: { 11: 'n' } })?.has('ie'),
      false
    );
  });

  test('adds no browser that browser-compat-data lacks', () => {
    assert.equal(
      tightenAlphaHex({}, { op_mini: { all: 'y' }, ie: { 11: 'y' } })?.size,
      0
    );
  });

  test('leaves a feature without a caniuse entry as browser-compat-data has it', () => {
    const features = new Map([['unit:q', new Map([['chrome', '63']])]]);
    assert.equal(
      tightenWithCaniuse(features, () => {
        throw new Error('unexpected lookup');
      })
        .get('unit:q')
        ?.get('chrome'),
      '63'
    );
  });

  test('maps only tracked features to caniuse entries that exist', () => {
    for (const [feature, id] of caniuseFeatureIds) {
      assert.ok(featureBcdPaths.has(feature), feature);
      assert.ok(caniuse.features[id], id);
    }
  });
});
