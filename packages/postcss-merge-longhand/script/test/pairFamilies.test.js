import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import css from '@webref/css';
import { pairFamilies } from '../../src/lib/decl/pairForms.js';

const webref = await css.listAll();

/**
 * The shorthands webref says include one of the given longhands. Vendor
 * prefixed spellings are left out because pairFamilyOf strips the prefix.
 *
 * @param {string[]} longhands
 * @return {string[]}
 */
function shorthandsOf(longhands) {
  return webref.properties
    .filter(
      (property) =>
        !property.name.startsWith('-') &&
        property.longhands?.some((longhand) => longhands.includes(longhand))
    )
    .map((property) => property.name);
}

describe('pair family names', () => {
  for (const family of pairFamilies) {
    test(`names every shorthand that webref says resets a ${family.shorthand} longhand`, () => {
      const names = new Set([
        family.shorthand,
        ...family.longhands,
        ...family.aliases,
      ]);
      const missing = shorthandsOf([
        family.shorthand,
        ...family.longhands,
      ]).filter((name) => !names.has(name));
      assert.deepEqual(missing, []);
    });
  }

  test('column-rule aliases are exactly the shorthands that webref says reset its longhands', () => {
    const family = pairFamilies.find((f) => f.shorthand === 'column-rule');
    const resetting = shorthandsOf([family.shorthand, ...family.longhands])
      .filter((name) => name !== family.shorthand)
      .toSorted();
    assert.deepEqual([...family.aliases].toSorted(), resetting);
  });
});
