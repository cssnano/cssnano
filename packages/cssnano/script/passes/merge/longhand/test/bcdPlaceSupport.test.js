import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import browserslist from 'browserslist';
import bcdData from '@mdn/browser-compat-data' with { type: 'json' };
import committed from '../../../../../src/passes/merge/lib/longhand/data/placeSupport.json' with { type: 'json' };
import {
  alignmentKeywordSubfeatures,
  buildPlaceSupport,
  serializePlaceSupport,
  validatePlaceSupport,
} from '../lib/bcdPlaceSupport.js';
import {
  browserslistNames,
  earliestVersion,
  supportOf,
} from '../lib/bcdSupport.js';
import { compareVersions } from '../../../../../src/utils/versions.js';
import { widelySupported } from '../../../../../src/passes/merge/lib/longhand/decl/alignmentForms.js';

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

  test('requires a layout context that BCD names context_grid', () => {
    const data = bcd({ firefox: { version_added: '45' } });
    data.css.properties['place-content'].context_grid = {
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

/* BCD dates these keywords on the flex-layout longhands by when they took
 * effect there (Chrome 93, Safari 15.4), noting that earlier releases already
 * parsed them. Grid-only justify-self records when each engine first parsed
 * them, so they are checked against the earliest record on any longhand. */
const flexDatedKeywords = new Set(['start', 'end', 'self-start', 'self-end']);

/**
 * @param {import('../lib/bcdSupport.js').CompatEntry} entry
 * @param {string} bcdName
 * @return {string | undefined} the earliest plain version BCD records
 * unprefixed, unflagged support from, whether or not the record is a list
 */
function versionAdded(entry, bcdName) {
  const support = supportOf(entry)?.[bcdName];
  return support && earliestVersion(support, () => true);
}

/**
 * The earliest version at which any alignment longhand records each
 * flex-dated keyword, by keyword and BCD browser name.
 *
 * @param {import('../lib/bcdSupport.js').CompatData} data
 * @return {Map<string, Map<string, string>>}
 */
function earliestFlexDatedSupport(data) {
  /** @type {Map<string, Map<string, string>>} */
  const earliest = new Map();
  for (const [name, entry] of alignmentKeywordSubfeatures(data)) {
    if (!flexDatedKeywords.has(name)) continue;
    const byBrowser = earliest.get(name) ?? new Map();
    earliest.set(name, byBrowser);
    for (const [bcdName] of browserslistNames) {
      const added = versionAdded(entry, bcdName);
      const known = byBrowser.get(bcdName);
      if (added && (!known || compareVersions(added, known) < 0)) {
        byBrowser.set(bcdName, added);
      }
    }
  }
  return earliest;
}

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

  test('requires space-evenly that BCD lists directly under the longhand', () => {
    const data = bcd({ chrome: { version_added: '59' } });
    data.css.properties['justify-content'] = {
      'space-evenly': {
        __compat: { support: { chrome: { version_added: '60' } } },
      },
    };
    assert.equal(buildPlaceSupport(data).get('chrome'), '60');
  });

  test('ignores a keyword outside the allowlist', () => {
    const data = withSpaceEvenly('50');
    data.css.properties['align-content'].flex_context['last_baseline'] = {
      __compat: { support: { chrome: { version_added: '108' } } },
    };
    assert.equal(buildPlaceSupport(data).get('chrome'), '59');
  });
});

/**
 * @param {import('../lib/bcdSupport.js').CompatData} data
 * @param {string} keyword
 */
function withoutKeyword(data, keyword) {
  const copy = structuredClone(data);
  for (const property of Object.values(copy.css.properties)) {
    delete property[keyword];
    for (const context of Object.values(property)) delete context[keyword];
  }
  return copy;
}

describe('validatePlaceSupport', () => {
  test('accepts the pinned browser compatibility data', () => {
    assert.doesNotThrow(() =>
      validatePlaceSupport(buildPlaceSupport(bcdData), bcdData)
    );
  });

  test('rejects data in which BCD no longer lists space-evenly, so a renamed subfeature cannot loosen the gate', () => {
    const data = withoutKeyword(bcdData, 'space-evenly');
    assert.throws(
      () => validatePlaceSupport(buildPlaceSupport(data), data),
      /space-evenly/v
    );
  });

  test('rejects data in which BCD no longer lists first_baseline, so a renamed subfeature cannot loosen the gate', () => {
    const data = withoutKeyword(bcdData, 'first_baseline');
    assert.throws(
      () => validatePlaceSupport(buildPlaceSupport(data), data),
      /first_baseline/v
    );
  });

  test('rejects data in which a shorthand lists no grid layout context', () => {
    const data = structuredClone(bcdData);
    const property = data.css.properties['place-content'];
    delete property.grid_context;
    delete property.context_grid;
    assert.throws(
      () => validatePlaceSupport(buildPlaceSupport(data), data),
      /place-content.*grid/v
    );
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
    const flexDated = earliestFlexDatedSupport(bcdData);
    let checked = 0;
    for (const [name, entry] of alignmentKeywordSubfeatures(bcdData)) {
      if (!name.split('_').every((word) => widelySupported.has(word))) {
        continue;
      }
      for (const [bcdName, browserslistName] of browserslistNames) {
        const added = flexDatedKeywords.has(name)
          ? flexDated.get(name)?.get(bcdName)
          : versionAdded(entry, bcdName);
        if (added === undefined || !committed[browserslistName]) continue;
        checked++;
        assert.ok(
          compareVersions(committed[browserslistName], added) >= 0,
          `${browserslistName} ${name}`
        );
      }
    }
    assert.ok(checked > 0);
  });
});
