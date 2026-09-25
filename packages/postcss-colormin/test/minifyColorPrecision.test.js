import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import * as core from '@colordx/core';
import minifyColor from '../src/minifyColor.js';

function min(input, options = {}) {
  const defaultOptions = {
    alphaHex: false,
    transparent: true,
    name: true,
  };
  return minifyColor(input, { ...defaultOptions, ...options });
}

function isEqual(input, output) {
  return () => assert.strictEqual(min(input), output);
}

describe('Lossless round-trip tests', () => {
  test('should not produce a lossier representation for rgb(143 101 98 / 43%)', () => {
    const result = min('rgb(143 101 98 / 43%)');
    const { colordx } = core;
    const orig = colordx('rgb(143, 101, 98)').toRgb();
    const roundtrip = colordx(result).toRgb();
    assert.strictEqual(Math.round(roundtrip.r), Math.round(orig.r));
    assert.strictEqual(Math.round(roundtrip.g), Math.round(orig.g));
    assert.strictEqual(Math.round(roundtrip.b), Math.round(orig.b));
  });

  test('should not produce a lossier representation for rgba(221, 221, 221, 0.5)', () => {
    const result = min('rgba(221, 221, 221, 0.5)');
    const { colordx } = core;
    const orig = colordx('rgb(221, 221, 221)').toRgb();
    const roundtrip = colordx(result).toRgb();
    assert.strictEqual(Math.round(roundtrip.r), Math.round(orig.r));
    assert.strictEqual(Math.round(roundtrip.g), Math.round(orig.g));
    assert.strictEqual(Math.round(roundtrip.b), Math.round(orig.b));
  });
});

describe('Modern CSS color formats', () => {
  test('should minify sRGB-equivalent oklch to hex', () => {
    assert.strictEqual(min('oklch(0.5 0.1 240)'), '#1f6a96');
    assert.strictEqual(min('oklch(0.6279 0.2577 29.23)'), 'red');
  });

  test('should not clip wide-gamut oklch to sRGB hex', () => {
    assert.strictEqual(min('oklch(0.5 0.2 240)'), 'oklch(.5 .2 240)');
  });

  test('should minify sRGB-equivalent oklab to hex', () => {
    assert.strictEqual(min('oklab(0.5 0.1 -0.2)'), '#7532d0');
  });

  test('should minify hwb to hex', () => {
    assert.strictEqual(min('hwb(120 0% 0%)'), '#0f0');
  });

  test('should pass through lch values (requires lch plugin, not loaded by default)', () => {
    assert.strictEqual(
      min('lch(54.29 106.84 40.85)'),
      'lch(54.29 106.84 40.85)'
    );
  });

  test('should pass through color() function values', () => {
    assert.strictEqual(
      min('color(display-p3 0.9176 0.2003 0.1386)'),
      'color(display-p3 0.9176 0.2003 0.1386)'
    );
  });
});

describe('Precision regressions', () => {
  // bootstrap-v4.2.1: lossy HSL -> lossless rgba
  test(
    'should keep rgba(130,138,145,.5) as rgba rather than lossy hsla',
    isEqual('rgba(130, 138, 145, 0.5)', 'rgba(130,138,145,.5)')
  );
  test(
    'should keep rgba(216,217,219,.5) as rgba rather than lossy hsla',
    isEqual('rgba(216, 217, 219, 0.5)', 'rgba(216,217,219,.5)')
  );
  test(
    'should keep rgba(108,117,125,.5) as rgba rather than lossy hsla',
    isEqual('rgba(108, 117, 125, 0.5)', 'rgba(108,117,125,.5)')
  );

  // foundation-v6.5.3
  test(
    'should minify near-white rgba(254,254,254,.25) to hsla with decimal precision, not round to 100%',
    isEqual('rgba(254, 254, 254, 0.25)', 'hsla(0,0%,99.6%,.25)')
  );

  // picnic-v6.4.0
  test(
    'should keep rgba(17,17,17,.1) as rgba rather than lossy hsla(0,0%,7%)',
    isEqual('rgba(17, 17, 17, 0.1)', 'rgba(17,17,17,.1)')
  );
  test(
    'should keep rgba(17,17,17,.2) as rgba rather than lossy hsla(0,0%,7%)',
    isEqual('rgba(17, 17, 17, 0.2)', 'rgba(17,17,17,.2)')
  );
  test(
    'should keep rgba(17,17,17,.3) as rgba rather than lossy hsla(0,0%,7%)',
    isEqual('rgba(17, 17, 17, 0.3)', 'rgba(17,17,17,.3)')
  );
  test(
    'should keep rgba(17,17,17,.6) as rgba rather than lossy hsla(0,0%,7%)',
    isEqual('rgba(17, 17, 17, 0.6)', 'rgba(17,17,17,.6)')
  );

  // semantic-ui-v2.4.1
  test(
    'should output hsla with decimal lightness for rgba(100,100,100,.3) — 39.2% not 39%',
    isEqual('rgba(100, 100, 100, 0.3)', 'hsla(0,0%,39.2%,.3)')
  );
  test(
    'should output hsla with decimal lightness for rgba(100,100,100,.4) — 39.2% not 39%',
    isEqual('rgba(100, 100, 100, 0.4)', 'hsla(0,0%,39.2%,.4)')
  );
  test(
    'should keep rgba(128,135,139,.8) as rgba rather than lossy hsla(202,5%,52%)',
    isEqual('rgba(128, 135, 139, 0.8)', 'rgba(128,135,139,.8)')
  );
  test(
    'should output hsla with decimal lightness for rgba(225,225,225,.3) — 88.2% not 88%',
    isEqual('rgba(225, 225, 225, 0.3)', 'hsla(0,0%,88.2%,.3)')
  );

  // turret-v5.1.3
  test(
    'should keep hsl(220,80%,50%) as hsl rather than a half-byte hex',
    isEqual('hsl(220, 80%, 50%)', 'hsl(220,80%,50%)')
  );
  test(
    'should minify hsl(20,100%,55%) to exact hex #ff661a',
    isEqual('hsl(20, 100%, 55%)', '#ff661a')
  );
  test(
    'should minify hsl(270,80%,50%) to exact hex #801ae6',
    isEqual('hsl(270, 80%, 50%)', '#801ae6')
  );
  test(
    'should keep hsl(320,80%,50%) as hsl rather than a half-byte hex',
    isEqual('hsl(320, 80%, 50%)', 'hsl(320,80%,50%)')
  );
});
