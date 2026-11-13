import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import defaultPreset from '#presets/default';

// U+212A KELVIN SIGN lowercases to `k` under toLowerCase, but not under ASCII case folding.
const KELVIN_SIGN = 'K';

describe('an at-rule name folds ASCII case only', () => {
  // An unknown at-rule is not overridden, so its two bodies merge as any two of them do.
  test('two @Keyframes rules with a Kelvin sign in place of k are not overridden by one another', async () => {
    const css = `@${KELVIN_SIGN}eyframes k{from{color:red}}@${KELVIN_SIGN}eyframes k{from{color:blue}}`;
    const result = await postcss(defaultPreset()).process(css, {
      from: undefined,
    });
    assert.equal(
      result.css,
      `@${KELVIN_SIGN}eyframes k{from{color:red;color:blue}}`
    );
  });

  test('the selectors of a Kelvin-named at-rule are not read as keyframe selectors', async () => {
    const result = await postcss(defaultPreset()).process(
      `@${KELVIN_SIGN}eyframes k{from{color:red}}`,
      { from: undefined }
    );
    assert.equal(result.css, `@${KELVIN_SIGN}eyframes k{from{color:red}}`);
  });
});
