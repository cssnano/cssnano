import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colordx as colord, extend } from '@colordx/core';
import hwbPlugin from '@colordx/core/plugins/hwb';
import namesPlugin from '@colordx/core/plugins/names';
import isKnownColor, { dynamicColorKeywords } from '../src/isKnownColor.js';

// Mirror the source module's parser configuration; loading the lab, lch, p3
// and cmyk plugins here would flip the rejection tests below.
extend([hwbPlugin, namesPlugin]);

// Keywords the CSS-wide-keyword production accepts anywhere a declaration value
// appears, none of which are a `<color>`.
const cssWideKeywords = [
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
];

test('should accept every CSS colour syntax', () => {
  for (const color of [
    // hex
    '#fff',
    '#ff0000',
    '#ff000080',
    // legacy comma-separated functional notation
    'rgb(255,0,0)',
    'rgba(255,0,0,0.5)',
    'hsl(0,100%,50%)',
    'hsla(0,100%,50%,0.5)',
    // modern space-separated syntax
    'rgb(255 0 0)',
    'rgb(255 0 0 / 0.5)',
    // modern colour spaces
    'oklch(0.5 0.2 240)',
    'oklab(0.5 0.1 -0.2)',
    'hwb(120 0% 0%)',
    'color(srgb 1 0 0)',
    // named colours and the transparent keyword
    'red',
    'yellow',
    'transparent',
  ])
    assert.strictEqual(isKnownColor(color), true, `${color} is a colour`);
});

// Valid colour notations the source module deliberately leaves unresolved so
// `postcss-colormin` behaviour stays unchanged; the plugin still treats them
// as stop colours.
test('should reject colour notations whose plugins stay unloaded', () => {
  for (const color of [
    'lab(50% 20 30)',
    'lch(50 100 30)',
    'color(display-p3 1 0 0)',
    'device-cmyk(0 81% 81% 30%)',
  ])
    assert.strictEqual(
      isKnownColor(color),
      false,
      `${color} should not resolve as a colour`
    );
});

// Relative colour syntax and the colour-mixing functions derive a colour
// from other colours rather than denoting one, so no colour parser accepts
// them standalone; the plugin still treats them as stop colours.
test('should reject colour expressions no colour parser resolves', () => {
  for (const color of [
    'rgb(from red r g b / 0.5)',
    'hsl(from red h s l)',
    'color-mix(in srgb, red, blue)',
    'light-dark(red, blue)',
    'contrast-color(red)',
  ])
    assert.strictEqual(
      isKnownColor(color),
      false,
      `${color} should not resolve as a colour`
    );
});

test('should reject values that are not a colour', () => {
  for (const color of [
    '',
    'notacolor',
    'none',
    'current',
    ...cssWideKeywords,
    // positions and formulas, which are stops but not colours
    '0',
    '10px',
    '50%',
    'calc(100%)',
    'var(--color)',
  ])
    assert.strictEqual(isKnownColor(color), false, `${color} is no colour`);
});

// Independent oracle transcribed from CSS Color 4 § 3.3; set equivalence
// against it catches drift in either direction.
const systemColorKeywords = new Set([
  // CSS Color 4 system colours
  'accentcolor',
  'accentcolortext',
  'activetext',
  'buttonborder',
  'buttonface',
  'buttontext',
  'canvas',
  'canvastext',
  'field',
  'fieldtext',
  'graytext',
  'highlight',
  'highlighttext',
  'linktext',
  'mark',
  'marktext',
  'selecteditem',
  'selecteditemtext',
  'visitedtext',
  // Deprecated system colours (CSS Color 3 / CSS Color 4 § 3.3.1)
  'activeborder',
  'activecaption',
  'appworkspace',
  'background',
  'buttonhighlight',
  'buttonshadow',
  'captiontext',
  'inactiveborder',
  'inactivecaption',
  'inactivecaptiontext',
  'infobackground',
  'infotext',
  'menu',
  'menutext',
  'scrollbar',
  'threeddarkshadow',
  'threedface',
  'threedhighlight',
  'threedlightshadow',
  'threedshadow',
  'window',
  'windowframe',
  'windowtext',
]);

test('should hold exactly the CSS Color 4 system colours plus currentcolor', () => {
  const keywords = new Set(dynamicColorKeywords);
  keywords.delete('currentcolor');
  assert.deepEqual(
    [...keywords].toSorted(),
    [...systemColorKeywords].toSorted()
  );
});

test('should resolve every system colour as a colour', () => {
  for (const keyword of systemColorKeywords)
    assert.strictEqual(isKnownColor(keyword), true, keyword);
});

test('should accept currentcolor, which resolves at used-value time', () => {
  assert.strictEqual(isKnownColor('currentcolor'), true);
});

test('should hold only lowercase identifiers, as callers lowercase source text', () => {
  for (const keyword of dynamicColorKeywords)
    assert.match(keyword, /^[a-z][a-z0-9\-]*$/v);
});

test('should reject a spelling that callers would have to lowercase', () => {
  assert.strictEqual(isKnownColor('CURRENTCOLOR'), false);
});

test('should list no keyword that colord already resolves', () => {
  for (const keyword of dynamicColorKeywords)
    assert.strictEqual(
      colord(keyword).isValid(),
      false,
      `${keyword} needs the keyword list`
    );
});

test('should list no CSS-wide keyword as a colour', () => {
  for (const keyword of cssWideKeywords)
    assert.strictEqual(dynamicColorKeywords.has(keyword), false);
});
