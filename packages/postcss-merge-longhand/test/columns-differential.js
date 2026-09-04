import assert from 'node:assert';
import { test } from 'node:test';
import postcss from 'postcss';
import columns from '../src/lib/decl/columns.js';

/* Frozen from the former valueParser.unit() contract. This oracle is kept
 * independent of the tokenizer implementation under test. */
const legacyUnit = /^([+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)(.*)$/;
const legacyLengthUnit = /^[a-z]+$/i;

/** @param {string} value @return {'width' | 'count' | 'initial' | undefined} */
function legacyRole(value) {
  if (value.toLowerCase() === 'auto') return 'initial';
  const match = value.match(legacyUnit);
  if (!match) return undefined;
  if (match[2] === '') return /^\d+$/.test(match[1]) ? 'count' : undefined;
  return legacyLengthUnit.test(match[2]) ? 'width' : undefined;
}

/** @param {string} value @return {boolean} */
function legacyCanExplode(value) {
  const values = value.trim().split(/\s+/);
  if (values.length > 2) return false;
  const roles = values.map(legacyRole);
  if (roles.some((role) => role === undefined)) return false;
  const used = new Set(roles.filter((role) => role !== 'initial'));
  return used.size === roles.filter((role) => role !== 'initial').length;
}

// Escaped units are intentionally excluded: the tokenizer decodes them, while
// the frozen legacy classifier treated their raw spelling as an unknown unit.
for (const value of ['12em 3', '3 12em', 'auto 3', '2.5']) {
  test(`tokenizer columns agree with frozen legacy classifier for ${value}`, () => {
    const root = postcss.parse(`h1{columns:${value}}`);
    const rule = root.first;
    columns.explode(rule);
    const exploded = rule.nodes.some(
      (node) => node.type === 'decl' && node.prop === 'column-width'
    );
    // A valid two-component legacy classification is exactly the path that
    // the columns reducer can explode into its two longhands.
    const expected =
      legacyCanExplode(value) && value.trim().split(/\s+/).length === 2;
    assert.equal(exploded, expected);
  });
}
