import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import browserslist from 'browserslist';
import bcdData from '@mdn/browser-compat-data' with { type: 'json' };
import committed from '../../src/data/pairSupport.json' with { type: 'json' };
import { pairFamilies } from '../../src/lib/decl/pairForms.js';
import {
  buildPairSupport,
  parsingSupportSince,
  serializePairSupport,
} from '../lib/bcdPairSupport.js';
import { compareVersions } from '../../src/lib/compareVersions.js';

/** @param {Record<string, object>} support */
const entry = (support) => ({ __compat: { support } });

/**
 * @param {Record<string, object>} shorthand
 * @param {Record<string, object>} [longhand]
 */
function bcd(shorthand, longhand = shorthand) {
  return {
    css: {
      properties: {
        gap: entry(shorthand),
        'row-gap': entry(longhand),
        'column-gap': entry(longhand),
      },
    },
  };
}

describe('parsingSupportSince', () => {
  test('counts a partial implementation because only parsing matters', () => {
    assert.equal(
      parsingSupportSince([
        { version_added: '144' },
        { version_added: '63', partial_implementation: true },
      ]),
      '63'
    );
  });

  test('has no answer when the newest statement is prefixed', () => {
    assert.equal(
      parsingSupportSince({ version_added: '4', prefix: '-webkit-' }),
      undefined
    );
  });

  test('has no answer when the newest statement was removed', () => {
    assert.equal(
      parsingSupportSince({ version_added: '4', version_removed: '9' }),
      undefined
    );
  });

  test('counts a removed statement that runs straight into later support', () => {
    assert.equal(
      parsingSupportSince([
        { version_added: '144' },
        {
          version_added: '63',
          partial_implementation: true,
          version_removed: '144',
        },
      ]),
      '63'
    );
  });

  test('ignores a removed statement that leaves a gap before later support', () => {
    assert.equal(
      parsingSupportSince([
        { version_added: '37' },
        { version_added: '11.1', version_removed: '12.1' },
      ]),
      '37'
    );
  });

  test('ignores a removed statement whose successor is only prefixed', () => {
    assert.equal(
      parsingSupportSince([
        { version_added: '30' },
        { version_added: '9', version_removed: '21' },
        { version_added: '21', prefix: '-webkit-' },
      ]),
      '30'
    );
  });

  test('ignores an earlier prefixed statement', () => {
    assert.equal(
      parsingSupportSince([
        { version_added: '29' },
        { version_added: '21', prefix: '-webkit-' },
      ]),
      '29'
    );
  });
});

describe('buildPairSupport', () => {
  test('requires the latest of the shorthand and its longhands', () => {
    const data = buildPairSupport(
      bcd(
        { firefox: { version_added: '63' } },
        { firefox: { version_added: '52' } }
      )
    );
    assert.equal(data.get('gap')?.get('firefox'), '63');
  });

  test('requires a layout context where the shorthand lags behind the longhand', () => {
    const data = bcd({ chrome: { version_added: '57' } });
    data.css.properties.gap.flex_context = {
      __compat: { support: { chrome: { version_added: '84' } } },
    };
    assert.equal(buildPairSupport(data).get('gap')?.get('chrome'), '84');
  });

  test('requires the normal keyword of gap', () => {
    const data = bcd({ chrome: { version_added: '57' } });
    data.css.properties.gap.normal = {
      __compat: { support: { chrome: { version_added: '66' } } },
    };
    assert.equal(buildPairSupport(data).get('gap')?.get('chrome'), '66');
  });

  test('omits a browser that lacks the shorthand', () => {
    const data = buildPairSupport(
      bcd({ ie: { version_added: false } }, { ie: { version_added: '10' } })
    );
    assert.equal(data.get('gap')?.has('ie'), false);
  });
});

describe('committed pair support data', () => {
  test('has data for every family the reducer gates on support', () => {
    const gated = pairFamilies.flatMap((f) =>
      f.supportKey ? [f.supportKey] : []
    );
    assert.deepEqual(gated.toSorted(), Object.keys(committed).toSorted());
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
      JSON.parse(serializePairSupport(buildPairSupport(bcdData))),
      committed
    );
  });
});
