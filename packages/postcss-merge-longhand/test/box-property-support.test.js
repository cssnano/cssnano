import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import boxSupportData from '../src/data/boxPropertySupport.json' with { type: 'json' };
import { compareVersions } from '../src/lib/compareVersions.js';
import { boxProperties } from '../src/lib/decl/boxGroups.js';
import { BoxSupport } from '../src/lib/targetSupport.js';

/**
 * @param {string} name
 * @return {import('../src/lib/decl/boxGroups.js').BoxProperty}
 */
function property(name) {
  return /** @type {import('../src/lib/decl/boxGroups.js').BoxProperty} */ (
    boxProperties.get(name)
  );
}

describe('supportsAll', () => {
  test('accepts margin for any target because CSS 1 defines it', () => {
    assert.equal(
      new BoxSupport(['op_mini all', 'ie 5.5']).supportsAll('margin'),
      true
    );
  });

  test('accepts padding for a target the compatibility data does not cover', () => {
    assert.equal(
      new BoxSupport(['kaios 3.0-3.1']).supportsAll('padding'),
      true
    );
  });

  test('accepts inset when every target has shipped it', () => {
    assert.equal(
      new BoxSupport(['chrome 87', 'firefox 66', 'safari 14.1']).supportsAll(
        'inset'
      ),
      true
    );
  });

  test('rejects inset when one target predates it', () => {
    assert.equal(
      new BoxSupport(['chrome 87', 'safari 14.0']).supportsAll('inset'),
      false
    );
  });

  test('rejects inset for Internet Explorer', () => {
    assert.equal(new BoxSupport(['ie 11']).supportsAll('inset'), false);
  });

  test('rejects inset for Opera Mini because no data shows it ships there', () => {
    assert.equal(new BoxSupport(['op_mini all']).supportsAll('inset'), false);
  });

  test('rejects a property the data does not describe', () => {
    assert.equal(
      new BoxSupport(['chrome 120']).supportsAll('margin-trim'),
      false
    );
  });

  test('accepts a CSS 2 longhand for any target', () => {
    assert.equal(
      new BoxSupport(['op_mini all', 'ie 5.5']).supportsAll('top'),
      true
    );
    assert.equal(new BoxSupport(['ie 5.5']).supportsAll('margin-left'), true);
  });

  test('rejects a flow-relative longhand for a target that predates it', () => {
    assert.equal(
      new BoxSupport(['chrome 68']).supportsAll('margin-block-start'),
      false
    );
    assert.equal(
      new BoxSupport(['chrome 69']).supportsAll('margin-block-start'),
      true
    );
  });

  test('accepts a version range whose lowest version reaches the minimum', () => {
    assert.equal(
      new BoxSupport(['ios_saf 14.5-14.8']).supportsAll('inset'),
      true
    );
  });

  test('accepts a technology preview', () => {
    assert.equal(new BoxSupport(['safari TP']).supportsAll('inset'), true);
  });
});

describe('BoxSupport', () => {
  test('supports a property when every target does', () => {
    const support = new BoxSupport(['chrome 100', 'firefox 100']);
    assert.equal(support.supportsAll('margin-block'), true);
    assert.equal(support.supportsAll('inset-inline-start'), true);
  });

  test('does not support a property when one target lacks it', () => {
    const support = new BoxSupport(['chrome 100', 'ie 11']);
    assert.equal(support.supportsAll('margin-block'), false);
    assert.equal(support.supportsAll('margin'), true);
    assert.equal(support.supportsAll('top'), true);
  });

  test('counts a repeated target once', () => {
    const support = new BoxSupport(['chrome 100', 'chrome 100']);
    assert.equal(support.supportsAll('margin-block'), true);
  });

  test('lets a later property leave nothing of an earlier one showing when every target that knows the earlier also knows the later', () => {
    const support = new BoxSupport(['chrome 100', 'ie 11']);
    assert.equal(
      support.understandsWherever(
        property('margin-inline-start'),
        property('margin')
      ),
      true
    );
  });

  test('does not let a property override one a target understands but it does not', () => {
    const support = new BoxSupport(['chrome 100', 'ie 11']);
    assert.equal(
      support.understandsWherever(
        property('margin'),
        property('margin-inline-start')
      ),
      false
    );
    assert.equal(
      new BoxSupport(['chrome 80']).understandsWherever(
        property('margin-block-start'),
        property('margin-block')
      ),
      false
    );
  });

  test('lets a property override one that no target understands', () => {
    const support = new BoxSupport(['ie 11']);
    assert.equal(
      support.understandsWherever(
        property('scroll-margin-block-start'),
        property('scroll-margin')
      ),
      true
    );
  });

  test('does not let a property override one that a target the compatibility data does not cover may understand', () => {
    const support = new BoxSupport(['chrome 120', 'and_uc 15.5']);
    assert.equal(
      support.understandsWherever(
        property('margin-inline-start'),
        property('margin-inline')
      ),
      false
    );
  });

  test('lets a CSS 2 property override any property for a target the compatibility data does not cover', () => {
    const support = new BoxSupport(['chrome 120', 'kaios 2.5']);
    assert.equal(
      support.understandsWherever(
        property('margin-inline-start'),
        property('margin')
      ),
      true
    );
  });

  test('lets a property override itself', () => {
    const support = new BoxSupport(['ie 11']);
    assert.equal(
      support.understandsWherever(
        property('margin-top'),
        property('margin-top')
      ),
      true
    );
  });
});

describe('understandsWherever', () => {
  /* The data lists, per property, the first version of each engine that ships
   * it. An engine it does not list may understand anything. */
  const { engines, properties } = boxSupportData;

  /**
   * @param {string} entry
   * @param {string} name
   * @return {boolean} whether the target ships the property
   */
  function ships(entry, name) {
    const minimums =
      /** @type {Record<string, string | Record<string, string>>} */ (
        properties
      )[name];
    if (typeof minimums === 'string') return true;
    const [engine, version] = entry.split(' ');
    const minimum = minimums?.[engine];
    if (minimum === undefined) return false;
    return (
      version === 'TP' || compareVersions(version.split('-')[0], minimum) >= 0
    );
  }

  /**
   * @param {string[]} browsers
   * @param {string} earlier
   * @param {string} later
   * @return {boolean} whether every target that may understand `earlier`
   * ships `later`
   */
  function direct(browsers, earlier, later) {
    return browsers
      .filter(
        (entry) =>
          !engines.includes(entry.split(' ')[0]) || ships(entry, earlier)
      )
      .every((entry) => ships(entry, later));
  }

  const targetSets = [
    ['chrome 120', 'ie 11', 'safari 14', 'kaios 2.5', 'and_uc 15.5'],
    ['ie 11'],
    ['chrome 80'],
    ['op_mini all', 'chrome 120'],
  ];

  for (const browsers of targetSets) {
    test(`answers like a direct comparison of the targets for every pair of properties, asked twice, for ${browsers.join(', ')}`, () => {
      const entries = browsers;
      const support = new BoxSupport(entries);
      for (const [earlier, earlierProperty] of boxProperties) {
        for (const [later, laterProperty] of boxProperties) {
          const expected = earlier === later || direct(entries, earlier, later);
          const message = `${earlier} then ${later}`;
          assert.equal(
            support.understandsWherever(earlierProperty, laterProperty),
            expected,
            message
          );
          assert.equal(
            support.understandsWherever(earlierProperty, laterProperty),
            expected,
            `${message} again`
          );
        }
      }
    });
  }
});

describe('box property support data', () => {
  /* A shorthand slot that a later longhand of its family overrides is
   * rewritten freely, which holds only if no engine understands the
   * shorthand without its longhands. */
  test('never ships a shorthand in an engine before its own longhands', () => {
    const minimums =
      /** @type {Record<string, string | Record<string, string>>} */ (
        boxSupportData.properties
      );
    /** @type {string[]} */
    const violations = [];
    for (const shorthand of boxProperties.values()) {
      if (shorthand.slot !== -1) continue;
      const shorthandSince = minimums[shorthand.name];
      for (const longhand of shorthand.family.longhands) {
        const longhandSince = minimums[longhand];
        if (longhandSince === 'always') continue;
        if (shorthandSince === 'always') {
          violations.push(`${shorthand.name} before ${longhand} everywhere`);
          continue;
        }
        for (const [engine, version] of Object.entries(shorthandSince)) {
          const since = longhandSince[engine];
          if (since === undefined || compareVersions(since, version) > 0) {
            violations.push(
              `${shorthand.name} before ${longhand} in ${engine}`
            );
          }
        }
      }
    }
    assert.deepEqual(violations, []);
  });
});
