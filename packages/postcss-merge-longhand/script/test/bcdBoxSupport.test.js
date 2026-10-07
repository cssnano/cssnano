import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import browserslist from 'browserslist';
import bcdData from '@mdn/browser-compat-data' with { type: 'json' };
import committed from '../../src/data/boxPropertySupport.json' with { type: 'json' };
import longhandData from '../../src/data/longhands.json' with { type: 'json' };
import {
  alwaysSupported,
  buildBoxPropertySupport,
  serializeBoxPropertySupport,
  validateBoxPropertySupport,
} from '../lib/bcdBoxSupport.js';
import {
  browserslistNames,
  standardSupportSince,
  supportOf,
} from '../lib/bcdSupport.js';
import { compareVersions } from '../../src/lib/compareVersions.js';

/**
 * @param {Record<string, Record<string, object>>} properties
 */
function bcd(properties) {
  return {
    css: {
      properties: Object.fromEntries(
        Object.entries(properties).map(([name, support]) => [
          name,
          { __compat: { support } },
        ])
      ),
    },
  };
}

const inset = new Map([['inset', ['top', 'right', 'bottom', 'left']]]);

describe('buildBoxPropertySupport', () => {
  test('records the first version of each engine that supports the shorthand', () => {
    const data = buildBoxPropertySupport(
      bcd({
        inset: { chrome: { version_added: '87' } },
        top: { chrome: { version_added: '1' } },
        right: { chrome: { version_added: '1' } },
        bottom: { chrome: { version_added: '1' } },
        left: { chrome: { version_added: '1' } },
      }),
      inset
    );
    assert.deepEqual(data.get('inset'), new Map([['chrome', '87']]));
  });

  test('waits for the latest longhand because a shorthand cannot set one the engine lacks', () => {
    const data = buildBoxPropertySupport(
      bcd({
        inset: { chrome: { version_added: '60' } },
        top: { chrome: { version_added: '70' } },
        right: { chrome: { version_added: '1' } },
        bottom: { chrome: { version_added: '1' } },
        left: { chrome: { version_added: '1' } },
      }),
      inset
    );
    assert.equal(data.get('inset').get('chrome'), '70');
  });

  test('omits an engine without unprefixed, unflagged support', () => {
    const data = buildBoxPropertySupport(
      bcd({
        inset: {
          chrome: { version_added: '87', flags: [{ type: 'preference' }] },
          firefox: { version_added: false },
          safari: { version_added: '14.1', prefix: '-webkit-' },
        },
        top: { chrome: { version_added: '1' } },
      }),
      inset
    );
    assert.deepEqual(data.get('inset'), new Map());
  });

  test('keys minimums by browserslist name', () => {
    const data = buildBoxPropertySupport(
      bcd({
        inset: { safari_ios: { version_added: '14.5' } },
        top: { safari_ios: { version_added: '1' } },
        right: { safari_ios: { version_added: '1' } },
        bottom: { safari_ios: { version_added: '1' } },
        left: { safari_ios: { version_added: '1' } },
      }),
      inset
    );
    assert.deepEqual([...data.get('inset').keys()], ['ios_saf']);
  });

  test('marks the CSS 1 and 2 properties as supported by every engine, including those BCD omits', () => {
    const data = buildBoxPropertySupport(
      bcd({ margin: {}, 'margin-top': {}, top: {} }),
      new Map([
        ['margin', ['margin-top']],
        ['inset', ['top']],
      ])
    );
    assert.equal(data.get('margin'), alwaysSupported);
    assert.equal(data.get('margin-top'), alwaysSupported);
    assert.equal(data.get('top'), alwaysSupported);
  });

  test('records a longhand on its own support, not its shorthand', () => {
    const data = buildBoxPropertySupport(
      bcd({
        'margin-block': { chrome: { version_added: '87' } },
        'margin-block-start': { chrome: { version_added: '69' } },
      }),
      new Map([['margin-block', ['margin-block-start']]])
    );
    assert.equal(data.get('margin-block-start').get('chrome'), '69');
    assert.equal(data.get('margin-block').get('chrome'), '87');
  });
});

describe('validateBoxPropertySupport', () => {
  const engines = [...browserslistNames.keys()];
  /**
   * @param {object} [chrome] - the record for Chrome, omitted when undefined
   */
  const insetWithChrome = (chrome) =>
    bcd({
      inset: Object.fromEntries(
        engines
          .map((name) => [
            name,
            name === 'chrome' ? chrome : { version_added: '100' },
          ])
          .filter(([, statement]) => statement !== undefined)
      ),
    });
  const data = new Map([
    [
      'inset',
      new Map([
        ['chrome', '87'],
        ['firefox', '66'],
        ['safari', '14.1'],
      ]),
    ],
  ]);

  test('accepts data where every engine has a definite record', () => {
    assert.doesNotThrow(() =>
      validateBoxPropertySupport(
        data,
        insetWithChrome({ version_added: false })
      )
    );
  });

  test('rejects an engine without a record because absence would read as no support', () => {
    assert.throws(
      () => validateBoxPropertySupport(data, insetWithChrome()),
      /chrome/v
    );
  });

  test('rejects an unknown version because absence would read as no support', () => {
    assert.throws(
      () =>
        validateBoxPropertySupport(
          data,
          insetWithChrome({ version_added: null })
        ),
      /chrome/v
    );
  });

  test('rejects removed support because the versions that had it would read as lacking it', () => {
    assert.throws(
      () =>
        validateBoxPropertySupport(
          data,
          insetWithChrome({ version_added: '80', version_removed: '90' })
        ),
      /chrome/v
    );
  });

  test('ignores a removed statement under another name because it never counted as support', () => {
    assert.doesNotThrow(() =>
      validateBoxPropertySupport(
        data,
        insetWithChrome([
          { version_added: '87' },
          {
            version_added: '41',
            version_removed: '63',
            alternative_name: 'offset',
          },
        ])
      )
    );
  });
});

describe('committed box shorthand support data', () => {
  const shorthands = Object.keys(longhandData.boxGroups).flatMap((group) => [
    group,
    ...longhandData.boxGroups[group].axisShorthands,
  ]);
  const properties = shorthands.flatMap((name) => [
    name,
    ...longhandData.shorthands[name].longhands,
  ]);

  test('covers every shorthand and longhand of the five groups', () => {
    assert.deepEqual(
      Object.keys(committed.properties).toSorted(),
      properties.toSorted()
    );
  });

  test('lists as covered every engine that has a minimum version', () => {
    const covered = new Set(committed.engines);
    for (const minimums of Object.values(committed.properties)) {
      if (minimums === alwaysSupported) continue;
      assert.deepEqual(
        Object.keys(minimums).filter((name) => !covered.has(name)),
        []
      );
    }
  });

  test('lists Internet Explorer as covered, so its missing minimums mean no support', () => {
    assert.ok(committed.engines.includes('ie'));
  });

  test('leaves out the engines that browserslist knows but the compatibility data omits', () => {
    for (const name of ['and_qq', 'and_uc', 'kaios', 'op_mini']) {
      assert.ok(name in browserslist.data, name);
      assert.ok(!committed.engines.includes(name), name);
    }
  });

  test('names only browsers that browserslist knows', () => {
    const known = new Set(Object.keys(browserslist.data));
    assert.deepEqual(
      committed.engines.filter((name) => !known.has(name)),
      []
    );
    for (const minimums of Object.values(committed.properties)) {
      if (minimums === alwaysSupported) continue;
      assert.deepEqual(
        Object.keys(minimums).filter((name) => !known.has(name)),
        []
      );
    }
  });

  test('never claims support earlier than the longhands the shorthand sets', () => {
    let checked = 0;
    for (const [name, minimums] of Object.entries(committed.properties)) {
      if (minimums === alwaysSupported || !longhandData.shorthands[name])
        continue;
      for (const longhand of longhandData.shorthands[name].longhands) {
        for (const [bcdName, browserslistName] of browserslistNames) {
          const minimum = minimums[browserslistName];
          if (minimum === undefined) continue;
          const since = standardSupportSince(
            supportOf(bcdData.css.properties[longhand])?.[bcdName]
          );
          assert.ok(since !== undefined, `${browserslistName} ${longhand}`);
          assert.ok(
            compareVersions(minimum, since) >= 0,
            `${browserslistName} ${name} before ${longhand}`
          );
          checked++;
        }
      }
    }
    assert.ok(checked > 0);
  });

  test('never claims support the compatibility data does not record for the property itself', () => {
    for (const [name, minimums] of Object.entries(committed.properties)) {
      if (minimums === alwaysSupported) continue;
      for (const [bcdName, browserslistName] of browserslistNames) {
        const since = standardSupportSince(
          supportOf(bcdData.css.properties[name])?.[bcdName]
        );
        if (minimums[browserslistName] === undefined) continue;
        assert.ok(
          since !== undefined &&
            compareVersions(minimums[browserslistName], since) >= 0,
          `${browserslistName} ${name}`
        );
      }
    }
  });

  test('treats only the margin, padding and offset properties of CSS 1 and 2 as supported everywhere', () => {
    assert.deepEqual(
      Object.entries(committed.properties)
        .filter(([, minimums]) => minimums === alwaysSupported)
        .map(([name]) => name)
        .toSorted(),
      [
        'bottom',
        'left',
        'margin',
        'margin-bottom',
        'margin-left',
        'margin-right',
        'margin-top',
        'padding',
        'padding-bottom',
        'padding-left',
        'padding-right',
        'padding-top',
        'right',
        'top',
      ]
    );
  });

  test('leaves out Opera Mini for every property that is not CSS 1 or 2 because its compatibility data is not recorded', () => {
    for (const minimums of Object.values(committed.properties)) {
      if (minimums === alwaysSupported) continue;
      assert.equal(minimums.op_mini, undefined);
    }
  });

  test('matches the pinned browser compatibility data, so a bump needs a regenerate', () => {
    const shorthandLonghands = new Map(
      shorthands.map((name) => [name, longhandData.shorthands[name].longhands])
    );
    assert.deepEqual(
      JSON.parse(
        serializeBoxPropertySupport(
          buildBoxPropertySupport(bcdData, shorthandLonghands)
        )
      ),
      committed
    );
  });
});
