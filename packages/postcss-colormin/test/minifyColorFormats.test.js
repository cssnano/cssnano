import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
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

describe('Basic color conversions', () => {
  test('should lowercase keywords', isEqual('RED', 'red'));
  test('should convert shorthand hex to keyword', isEqual('#f00', 'red'));
  test('should convert longhand hex to keyword', isEqual('#ff0000', 'red'));
  test('should convert rgb to keyword', isEqual('rgb(255,0,0)', 'red'));
  test(
    'should convert fully opaque rgb to keyword',
    isEqual('rgba(255, 0, 0, 1)', 'red')
  );
  test('should convert hsl to keyword', isEqual('hsl(0, 100%, 50%)', 'red'));
  test(
    'should convert fully opaque hsl to keyword',
    isEqual('hsla(0, 100%, 50%, 1)', 'red')
  );
  test(
    'should convert translucent hsla to rgba',
    isEqual('hsla(0, 100%, 50%, .5)', 'rgba(255,0,0,.5)')
  );
  test(
    'should convert longhand hex to shorthand, case insensitive',
    isEqual('#FFFFFF', '#fff')
  );
  test(
    'should convert keyword to hex, case insensitive',
    isEqual('WHiTE', '#fff')
  );
  test('should convert keyword to hex', isEqual('yellow', '#ff0'));
  test('should convert rgb to hex', isEqual('rgb(12, 134, 29)', '#0c861d'));
  test('should convert hsl to hex', isEqual('hsl(230, 50%, 40%)', '#349'));
  test(
    'should convert another longhand hex to keyword',
    isEqual('#000080', 'navy')
  );
  test(
    'should convert rgba to shortest lossless form',
    isEqual('rgba(221, 221, 221, 0.5)', 'hsla(0,0%,86.7%,.5)')
  );
  test(
    'should convert this specific rgba value to "transparent"',
    isEqual('rgba(0,0,0,0)', 'transparent')
  );
  test(
    'should convert this specific hsla value to "transparent"',
    isEqual('hsla(0,0%,0%,0)', 'transparent')
  );
  test(
    'should convert hsla values with 0 saturation & 0 lightness to "transparent"',
    isEqual('hsla(200,0%,0%,0)', 'transparent')
  );
  test(
    'should leave transparent as it is',
    isEqual('transparent', 'transparent')
  );
  test(
    'should prefer to output hex rather than keywords when they are the same length',
    isEqual('#696969', '#696969')
  );
  test(
    'should cap values at their maximum',
    isEqual('rgb(400,400,400)', '#fff')
  );
  test(
    'should continue hsl value rotation',
    isEqual('hsl(400, 400%, 50%)', '#fa0')
  );
  test(
    'should convert signed numbers',
    isEqual('rgba(-100,0,-100,.5)', 'rgba(0,0,0,.5)')
  );
  test(
    'should convert signed numbers (2)',
    isEqual('hsla(-400, 50%, 10%, 0.5)', 'rgba(38,13,30,.5)')
  );
  test(
    'should convert percentage based rgb values',
    isEqual('rgb(100%,100%,100%)', '#fff')
  );
  test(
    'should convert percentage based rgba values (2)',
    isEqual('rgba(50%, 50%, 50%, 0.5)', 'hsla(0,0%,50%,.5)')
  );
  test(
    'should convert percentage based rgba values (3)',
    isEqual('rgb(100%,100%,100%)', '#fff')
  );
  test(
    'should convert percentage based rgba values (4)',
    isEqual('rgba(100%,100%,100%,0.5)', 'hsla(0,0%,100%,.5)')
  );
  test(
    'should convert percentage based rgba values (5)',
    isEqual('rgba(100%, 64.7%, 0%, .5)', 'rgba(255,165,0,.5)')
  );
  test(
    'should pass through on invalid rgb functions',
    isEqual('rgb(50%,23,54)', 'rgb(50%,23,54)')
  );
  test('should pass on non prefixed hexadecimal value', isEqual('999', '999'));
  test('should convert darkgray to a hex', isEqual('darkgray', '#a9a9a9'));
  test('should convert 8 character hex codes', isEqual('#000000FF', '#000'));
  test('should convert 4 character hex codes', isEqual('#000F', '#000'));
  test(
    'should pass through 8 character hex codes',
    isEqual('#00000004', '#00000004')
  );
  test('should pass through if not recognised', () => {
    assert.strictEqual(min('Unrecognised'), 'Unrecognised');
    assert.strictEqual(min('inherit'), 'inherit');
  });
});

describe('Alpha hex conversions', () => {
  test('should convert to hex4', () => {
    assert.strictEqual(min('#aabbcc33', { alphaHex: true }), '#abc3');
    assert.strictEqual(
      min('rgb(119,119,119,0.2)', { alphaHex: true }),
      '#7773'
    );
    assert.strictEqual(min('hsla(0,0%,100%,.4)', { alphaHex: true }), '#fff6');
  });

  test('should convert transparent to hex4 when alphaHex enabled', () => {
    assert.strictEqual(min('transparent', { alphaHex: true }), '#0000');
  });

  test('should convert to hex8', () => {
    assert.strictEqual(
      min('rgba(128, 128, 128, 0.5)', { alphaHex: true }),
      '#80808080'
    );
    assert.strictEqual(
      min('hsla(180, 100%, 50%, 0.5)', { alphaHex: true }),
      '#00ffff80'
    );
  });

  test('should not convert to alpha hex since the conversion is not lossless', () => {
    assert.strictEqual(
      min('rgba(0, 0, 0, 0.075)', { alphaHex: true }),
      'rgba(0,0,0,.075)'
    );
    assert.strictEqual(
      min('hsla(0, 0%, 50%, 0.515)', { alphaHex: true }),
      'hsla(0,0%,50%,.515)'
    );
  });

  test('should preserve percentage in color-mix', () => {
    assert.strictEqual(
      min('color-mix(#000, #FFF 0%)'),
      'color-mix(#000, #FFF 0%)'
    );
  });

  test('should preserve percentage in hsla', () => {
    assert.strictEqual(min('rgba(255,255,255,.7)'), 'hsla(0,0%,100%,.7)');
  });
});

describe('Named colors and namesPlugin', () => {
  test('should recognise named colors as valid and keep them when shortest', () => {
    assert.strictEqual(min('red'), 'red');
    assert.strictEqual(min('blue'), 'blue');
    assert.strictEqual(min('rebeccapurple'), '#639');
  });

  test('should convert hex to named color when name is shorter', () => {
    assert.strictEqual(min('#ff0000'), 'red');
    assert.strictEqual(min('#0000ff'), '#00f');
  });

  test('name:false should use hex instead of named colors', () => {
    assert.strictEqual(min('rgb(255,0,0)', { name: false }), '#f00');
    assert.strictEqual(min('yellow', { name: false }), '#ff0');
    assert.strictEqual(min('#ff0000', { name: false }), '#f00');
  });

  test('should pass through non-color keywords unchanged', () => {
    assert.strictEqual(min('currentcolor'), 'currentcolor');
    assert.strictEqual(min('inherit'), 'inherit');
  });
});

describe('Space-separated syntax and format flags', () => {
  test('should minify space-separated rgb() to shortest form', () => {
    assert.strictEqual(min('rgb(255 0 0)'), 'red');
    assert.strictEqual(min('rgb(0 0 0)'), '#000');
    assert.strictEqual(min('rgb(255 255 255)'), '#fff');
  });

  test('should minify space-separated rgb() with slash alpha', () => {
    assert.strictEqual(min('rgb(255 0 0 / 0.5)'), 'rgba(255,0,0,.5)');
    assert.strictEqual(min('rgb(255 0 0 / 50%)'), 'rgba(255,0,0,.5)');
  });

  test('should minify space-separated hsl() to shortest form', () => {
    assert.strictEqual(min('hsl(0 100% 50%)'), 'red');
    assert.strictEqual(min('hsl(0 100% 50% / 0.5)'), 'rgba(255,0,0,.5)');
  });

  test('should pass through currentColor unchanged', () => {
    assert.strictEqual(min('currentColor'), 'currentColor');
  });

  test('should pass through transparent unchanged', () => {
    assert.strictEqual(min('transparent'), 'transparent');
  });

  test('hsl:false should avoid hsl output and use rgba instead', () => {
    assert.strictEqual(
      min('rgba(50%, 50%, 50%, 0.5)', { hsl: false }),
      'rgba(128,128,128,.5)'
    );
  });

  test('rgb:false should avoid rgb output and use hsl instead', () => {
    assert.strictEqual(
      min('rgba(255, 0, 0, 0.5)', { rgb: false }),
      'hsla(0,100%,50%,.5)'
    );
  });
});
