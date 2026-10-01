import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import browserslist from 'browserslist';
import bcdData from '@mdn/browser-compat-data' with { type: 'json' };
import committed from '../../src/data/placeSupport.json' with { type: 'json' };
import {
  browserslistNames,
  buildPlaceSupport,
  serializePlaceSupport,
} from '../lib/bcdPlaceSupport.js';
import { compareVersions } from '../../src/lib/compareVersions.js';
import { widelySupported } from '../../src/lib/decl/alignmentForms.js';

/**
 * @param {Record<string, object>} contentSupport
 * @param {Record<string, object>} [itemsSupport]
 */
function bcd(contentSupport, itemsSupport = contentSupport) {
  return {
    css: {
      properties: {
        'place-content': { __compat: { support: contentSupport } },
        'place-items': { __compat: { support: itemsSupport } },
        'place-self': { __compat: { support: itemsSupport } },
      },
    },
  };
}

describe('buildPlaceSupport', () => {
  test('requires the latest of the three shorthands for each browser', () => {
    const data = buildPlaceSupport(
      bcd(
        { firefox: { version_added: '53' } },
        { firefox: { version_added: '45' } }
      )
    );
    assert.equal(data.get('firefox'), '53');
  });

  test('requires the latest layout context of a shorthand', () => {
    const data = bcd({ firefox: { version_added: '45' } });
    data.css.properties['place-content'].grid_context = {
      __compat: { support: { firefox: { version_added: '53' } } },
    };
    assert.equal(buildPlaceSupport(data).get('firefox'), '53');
  });

  test('ignores keyword subfeatures such as anchor-center', () => {
    const data = bcd({ firefox: { version_added: '45' } });
    data.css.properties['place-items']['anchor-center'] = {
      __compat: { support: { firefox: { version_added: '147' } } },
    };
    assert.equal(buildPlaceSupport(data).get('firefox'), '45');
  });

  test('keys minimums by browserslist name rather than BCD name', () => {
    const data = buildPlaceSupport(
      bcd({ safari_ios: { version_added: '11' } })
    );
    assert.deepEqual([...data.keys()], ['ios_saf']);
  });

  test('omits a browser that lacks one of the shorthands', () => {
    const data = buildPlaceSupport(
      bcd(
        { chrome: { version_added: '59' } },
        { chrome: { version_added: false } }
      )
    );
    assert.equal(data.has('chrome'), false);
  });

  test('omits support that is only behind a flag', () => {
    const data = buildPlaceSupport(
      bcd({ chrome: { version_added: '50', flags: [{ type: 'preference' }] } })
    );
    assert.equal(data.has('chrome'), false);
  });

  test('omits partial implementations', () => {
    const data = buildPlaceSupport(
      bcd({ edge: { version_added: '16', partial_implementation: true } })
    );
    assert.equal(data.has('edge'), false);
  });

  test('takes the earliest standard statement when partial support came first', () => {
    const data = buildPlaceSupport(
      bcd({
        safari: [
          { version_added: '11' },
          { version_added: '9', partial_implementation: true },
        ],
      })
    );
    assert.equal(data.get('safari'), '11');
  });

  test('omits support announced only for a preview release', () => {
    const data = buildPlaceSupport(
      bcd({ safari: { version_added: 'preview' } })
    );
    assert.equal(data.has('safari'), false);
  });

  test('takes the earliest of several standard statements', () => {
    const data = buildPlaceSupport(
      bcd({ chrome: [{ version_added: '60' }, { version_added: '59' }] })
    );
    assert.equal(data.get('chrome'), '59');
  });

  test('uses the upper bound of a ranged version', () => {
    const data = buildPlaceSupport(bcd({ opera: { version_added: '≤46' } }));
    assert.equal(data.get('opera'), '46');
  });
});

/* BCD records flex layout behavior, not parsing, for these keywords. */
const layoutOnlySubfeatures = new Set(['start_end']);

/** @param {string | boolean} version */
function withSpaceEvenly(version) {
  const data = bcd({ chrome: { version_added: '59' } });
  for (const property of ['align-content', 'justify-content']) {
    data.css.properties[property] = {
      flex_context: {
        'space-evenly': {
          __compat: { support: { chrome: { version_added: version } } },
        },
      },
    };
  }
  return data;
}

describe('buildPlaceSupport keyword requirements', () => {
  test('requires space-evenly support because one unparsed keyword drops the whole shorthand', () => {
    assert.equal(buildPlaceSupport(withSpaceEvenly('60')).get('chrome'), '60');
  });

  test('keeps the shorthand minimum when the keyword arrived earlier', () => {
    assert.equal(buildPlaceSupport(withSpaceEvenly('50')).get('chrome'), '59');
  });

  test('omits a browser that lacks an allowlisted keyword', () => {
    assert.equal(
      buildPlaceSupport(withSpaceEvenly(false)).has('chrome'),
      false
    );
  });

  test('ignores a keyword outside the allowlist', () => {
    const data = withSpaceEvenly('50');
    data.css.properties['align-content'].flex_context['last_baseline'] = {
      __compat: { support: { chrome: { version_added: '108' } } },
    };
    assert.equal(buildPlaceSupport(data).get('chrome'), '59');
  });
});

describe('compareVersions', () => {
  test('compares dotted versions numerically', () => {
    assert.ok(compareVersions('10.1', '9.3') > 0);
  });

  test('treats missing components as zero', () => {
    assert.equal(compareVersions('11', '11.0'), 0);
  });
});

describe('committed place-* support data', () => {
  test('names only browsers that browserslist knows', () => {
    const known = new Set(Object.keys(browserslist.data));
    assert.deepEqual(
      Object.keys(committed).filter((name) => !known.has(name)),
      []
    );
  });

  test('records each minimum as a plain dotted version', () => {
    for (const version of Object.values(committed)) {
      assert.match(version, /^\d+(?:\.\d+)*$/v);
    }
  });

  test('requires a release of each engine that browserslist has already shipped', () => {
    for (const [name, version] of Object.entries(committed)) {
      const released = browserslist.data[name].released;
      assert.ok(
        released.some((r) => compareVersions(r.split('-')[0], version) >= 0),
        name
      );
    }
  });

  test('matches the pinned browser compatibility data, so a bump needs a regenerate', () => {
    assert.deepEqual(
      JSON.parse(serializePlaceSupport(buildPlaceSupport(bcdData))),
      committed
    );
  });

  test('postdates every allowlisted keyword the compatibility data covers, so the allowlist stays true', () => {
    const contexts = [
      'align-content',
      'justify-content',
      'align-items',
      'justify-items',
      'align-self',
      'justify-self',
    ].flatMap((property) => [
      { property, context: 'flex_context' },
      { property, context: 'grid_context' },
    ]);
    let checked = 0;
    for (const { property, context } of contexts) {
      const subfeatures = bcdData.css.properties[property][context] ?? {};
      for (const [name, entry] of Object.entries(subfeatures)) {
        if (
          !name.split('_').every((word) => widelySupported.has(word)) ||
          layoutOnlySubfeatures.has(name)
        ) {
          continue;
        }
        for (const [bcdName, browserslistName] of browserslistNames) {
          // BCD names its compatibility record __compat.
          // eslint-disable-next-line no-underscore-dangle
          const added = entry.__compat.support[bcdName].version_added;
          if (typeof added !== 'string' || !committed[browserslistName]) {
            continue;
          }
          checked++;
          assert.ok(
            compareVersions(
              committed[browserslistName],
              added.replace(/^≤/v, '')
            ) >= 0,
            `${browserslistName} ${property} ${name}`
          );
        }
      }
    }
    assert.ok(checked > 0);
  });
});
