import assert from 'node:assert/strict';
import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import numericRangeProperties from '../src/data/numericRanges.json' with { type: 'json' };
import plugin from '../src/index.js';
import { isShapeEquivalent } from '../src/lib/decl/shapeEquivalence.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

/** @param {string} body @param {string} expected */
const discards = (body, expected) => processCSS(`a{${body}}`, `a{${expected}}`);

/** @param {string} body */
const keeps = (body) => passthroughCSS(`a{${body}}`);

test(
  'overridden top is discarded when the later value differs only numerically',
  discards('top:-10px;top:-5px', 'top:-5px')
);
test(
  'overridden property is discarded regardless of name case',
  discards('TOP:1px;top:2px', 'top:2px')
);
test(
  'overridden z-index integer is discarded',
  discards('z-index:1;z-index:2', 'z-index:2')
);
test(
  'overridden opacity number is discarded',
  discards('opacity:.5;opacity:.6', 'opacity:.6')
);
test(
  'overridden transform function is discarded when only arguments differ',
  discards('transform:scale(2);transform:scale(3)', 'transform:scale(3)')
);
test(
  'overridden transition is discarded when only the duration differs',
  discards('transition:all 1s;transition:all 2s', 'transition:all 2s')
);
// Numbers inside calc() stay fixed: older engines reject the later calc()
// while parsing, so the earlier declaration is their only valid value.
test(
  'overridden calc width is kept when only operands differ, because older engines reject the later calc',
  keeps('width:calc(100% - 10px);width:calc(100% - 20px)')
);
test(
  'overridden calc width is kept when a division by zero differs, because engines before infinity support reject it',
  keeps('width:calc(1px/(2 - 1));width:calc(1px/(1 - 1))')
);
test(
  'overridden translate argument is kept when only a number inside its calc differs',
  keeps(
    'transform:translate(calc(1px + 1px));transform:translate(calc(2px + 1px))'
  )
);
test(
  'overridden calc width is kept when only the unit inside it differs',
  keeps('width:calc(1px);width:calc(1em)')
);
test(
  'overridden hex colour is discarded when the hash has the same length',
  discards('color:#f00;color:#00f', 'color:#00f')
);
test(
  'overridden three-digit hex colour is discarded by a six-digit one',
  discards('color:#f00;color:#0000ff', 'color:#0000ff')
);
test(
  'overridden alpha hex colour is discarded by a later colour without alpha',
  discards('color:#f008;color:#00f', 'color:#00f')
);
test(
  'every earlier declaration of a chain is discarded',
  discards('top:1px;top:2px;top:3px', 'top:3px')
);
test(
  'overridden important declaration is discarded by a later important one',
  discards('top:1px!important;top:2px!important', 'top:2px!important')
);
test(
  'identical repeated values keep only the later declaration',
  discards('top:1px;top:1px', 'top:1px')
);
test('an empty nested rule does not end the run', () =>
  processCSS('a{top:1px;&:hover{}top:2px}', 'a{&:hover{}top:2px}')());
test(
  'a non-empty nested rule ends the run, so the earlier top is a different cascade layer',
  keeps('top:1px;&:hover{color:red}top:2px')
);

test(
  'negative width is kept because the sign class differs and negative widths are invalid',
  keeps('width:10px;width:-10px')
);
test(
  'z-index is kept because a fractional later value is invalid for an integer property',
  keeps('z-index:1;z-index:1.5')
);
test(
  'width is kept because a keyword may be unsupported where a length is valid',
  keeps('width:100px;width:fit-content')
);
test(
  'height is kept because dvh may be unsupported where vh is',
  keeps('height:100vh;height:100dvh')
);
test(
  'opacity is kept because a percentage may be unsupported where a number is valid',
  keeps('opacity:.5;opacity:50%')
);
test(
  'colour is kept because 8-digit hex may be unsupported where 6-digit is valid',
  keeps('color:#f00;color:#ff000080')
);
test(
  'colour keywords are kept because keyword support is not modelled',
  keeps('color:red;color:blue')
);
test(
  'prefixed display is kept as a fallback for the unprefixed keyword',
  keeps('display:-webkit-box;display:flex')
);
test(
  'prefixed position is kept as a fallback for the unprefixed keyword',
  keeps('position:-webkit-sticky;position:sticky')
);
test(
  'top is kept because var() resolves at computed-value time',
  keeps('top:1px;top:var(--a)')
);
test(
  'top is kept because a later two-component value is invalid',
  keeps('top:1px;top:1px 2px')
);
test(
  'top is kept because an empty later value is invalid',
  keeps('top:1px;top:')
);
test(
  'font-weight is kept because older browsers accept only multiples of 100',
  keeps('font-weight:400;font-weight:450')
);
test(
  'font-style is kept because an oblique angle above 90deg is invalid',
  keeps('font-style:oblique 10deg;font-style:oblique 100deg')
);
test(
  'font-style is kept when both oblique angles are in range, since its grammar bounds the angle',
  keeps('font-style:oblique 10deg;font-style:oblique 20deg')
);
test('every property whose grammar bounds a number keeps differing integers', async (t) => {
  for (const prop of numericRangeProperties) {
    await t.test(`${prop} is kept`, keeps(`${prop}:1;${prop}:2`));
  }
});
test(
  'initial-letter is kept because a drop cap below one line is invalid',
  keeps('initial-letter:1.5;initial-letter:0.5')
);
test(
  'text-combine-upright is kept because only two to four digits are valid',
  keeps('text-combine-upright:digits 2;text-combine-upright:digits 5')
);
test(
  '-webkit-initial-letter is kept because a drop cap below one line is invalid',
  keeps('-webkit-initial-letter:1.5;-webkit-initial-letter:.5')
);
test(
  '-webkit-font-weight is kept because older browsers accept only multiples of 100',
  keeps('-webkit-font-weight:400;-webkit-font-weight:450')
);
test(
  'an unknown property is kept because its grammar may bound the number',
  keeps('unknown-prop:1;unknown-prop:2')
);
test(
  '-webkit-box-flex is kept because the legacy property has no grammar to check',
  keeps('-webkit-box-flex:1;-webkit-box-flex:2')
);
test(
  'a prefixed alias of a known unbounded property still discards',
  discards(
    '-webkit-transform:scale(1);-webkit-transform:scale(2)',
    '-webkit-transform:scale(2)'
  )
);
test(
  '-ms-text-combine-horizontal is kept because only two to four digits are valid',
  keeps(
    '-ms-text-combine-horizontal:digits 2;-ms-text-combine-horizontal:digits 5'
  )
);
test(
  'cubic-bezier is kept because out-of-range x values are invalid',
  keeps(
    'transition-timing-function:cubic-bezier(.1,.2,.3,.4);transition-timing-function:cubic-bezier(2,.2,.3,.4)'
  )
);
test(
  'grid-template-areas is kept because strings carry grammar',
  keeps('grid-template-areas:"a b";grid-template-areas:"a"')
);
test(
  'content strings are kept because strings are compared verbatim',
  keeps('content:"a";content:"b"')
);
test(
  'prefixed property is kept because it is a different property',
  keeps('top:1px;-webkit-top:2px')
);
test(
  'logical and physical margins are kept because they are different properties',
  keeps('margin-inline-start:1px;margin-left:2px')
);
test(
  'normal declaration is kept before an important one because lanes are independent',
  keeps('top:1px!important;top:2px')
);
test(
  'star hack is kept because stylehacks targets one browser',
  keeps('*zoom:1;*zoom:2')
);
test(
  'backslash-nine hack is kept because it targets one browser',
  keeps('top:1px\\9;top:2px\\9')
);
test('custom properties are kept in this version', keeps('--a:1;--a:2'));
test('at-rule containers are untouched', () =>
  passthroughCSS('@font-face{src:url(a);src:url(b)}')());

test(
  'removal does not disturb unrelated declarations around it',
  discards('color:red;top:1px;left:0;top:2px', 'color:red;left:0;top:2px')
);

/** @param {string} a @param {string} b @param {string} [prop] */
const eq = (a, b, prop = 'top') => isShapeEquivalent(a, b, prop);

test('isShapeEquivalent accepts values differing only in magnitude', () =>
  assert.equal(eq('1px', '2px'), true));
test('isShapeEquivalent rejects a change of sign class', () =>
  assert.equal(eq('1px', '-1px'), false));
test('isShapeEquivalent rejects zero against positive', () =>
  assert.equal(eq('0px', '1px'), false));
test('isShapeEquivalent rejects integer against number', () =>
  assert.equal(eq('1', '1.5', 'z-index'), false));
test('isShapeEquivalent accepts a change between length units', () =>
  assert.equal(eq('1px', '1em'), true));
test('isShapeEquivalent rejects a unit named after the length class, which is no length', () =>
  assert.equal(eq('1length', '1px'), false));
// Older parsers predate scientific notation in CSS numbers.
test('isShapeEquivalent rejects scientific against plain notation', () =>
  assert.equal(eq('1.5px', '15e-1px'), false));
test('isShapeEquivalent accepts two numbers in scientific notation', () =>
  assert.equal(eq('1e1px', '2E+1px'), true));
test('isShapeEquivalent reads an ex unit after a decimal as no exponent', () =>
  assert.equal(eq('1.5ex', '2.5ex'), true));
test('isShapeEquivalent rejects a change from a length to an angle unit', () =>
  assert.equal(eq('1px', '1deg'), false));
test('isShapeEquivalent compares units case-insensitively', () =>
  assert.equal(eq('1PX', '2px'), true));
// Alpha hex support is isFallback's concern, not the shape's.
test('isShapeEquivalent accepts hex colours of different valid lengths', () =>
  assert.equal(eq('#fff', '#ffff', 'color'), true));
test('isShapeEquivalent rejects a valid hex colour against an invalid length', () =>
  assert.equal(eq('#fff', '#fffff', 'color'), false));
test('isShapeEquivalent accepts hex colours of equal length', () =>
  assert.equal(eq('#fff', '#000', 'color'), true));
test(
  'overridden hex colour is kept for an unknown property, because its grammar is unknown so the hash length stays fixed',
  keeps('-foo-bar:#abc;-foo-bar:#abcdef')
);
test(
  'overridden hex colour is discarded for a known colour property, which accepts any hex length',
  discards('color:#abc;color:#abcdef', 'color:#abcdef')
);
test('isShapeEquivalent accepts identical hex colours for an unknown property', () =>
  assert.equal(eq('#abc', '#abc', '-foo-bar'), true));
test('isShapeEquivalent rejects hex colours of different length for an unknown property', () =>
  assert.equal(eq('#abc', '#abcdef', '-foo-bar'), false));
test('isShapeEquivalent rejects an id-like hash that is not hex', () =>
  assert.equal(eq('#abc', '#xyz', 'color'), false));
test('isShapeEquivalent rejects hash lengths other than 3, 4, 6 or 8', () =>
  assert.equal(eq('#12345', '#54321', 'color'), false));
test('isShapeEquivalent accepts differing numbers inside a transform function', () =>
  assert.equal(
    eq('translate(1px, 2px)', 'translate(3px, 4px)', 'transform'),
    true
  ));
test('isShapeEquivalent rejects differing numbers inside nested parentheses of calc', () =>
  assert.equal(
    eq('calc((1px + 2px) * 3)', 'calc((5px + 6px) * 7)', 'width'),
    false
  ));
test('isShapeEquivalent accepts calc function names that differ only in case', () =>
  assert.equal(eq('calc(1px + 2px)', 'CALC(1px + 2px)', 'width'), true));
test('isShapeEquivalent rejects differing numbers inside an unlisted function', () =>
  assert.equal(eq('rgb(1,2,3)', 'rgb(1,2,4)', 'color'), false));
test('isShapeEquivalent accepts identical numbers inside an unlisted function', () =>
  assert.equal(eq('rgb(1,2,3)', 'RGB(1,2,3)', 'color'), true));
test('isShapeEquivalent rejects differing function names', () =>
  assert.equal(eq('scale(1)', 'scalex(1)', 'transform'), false));
test('isShapeEquivalent rejects differing strings', () =>
  assert.equal(eq('"a"', '"b"', 'content'), false));
test('isShapeEquivalent rejects differing idents', () =>
  assert.equal(eq('auto', 'none'), false));
test('isShapeEquivalent compares idents case-insensitively', () =>
  assert.equal(eq('AUTO', 'auto'), true));
test('isShapeEquivalent rejects whitespace at different positions', () =>
  assert.equal(eq('1px 2px', '1px2px'), false));
test('isShapeEquivalent accepts any whitespace width at the same position', () =>
  assert.equal(eq('1px 2px', '1px  2px'), true));
test('isShapeEquivalent rejects values of different token count', () =>
  assert.equal(eq('1px', '1px 2px'), false));
test('isShapeEquivalent rejects unbalanced parentheses', () =>
  assert.equal(eq('calc(1px', 'calc(2px'), false));
test('isShapeEquivalent rejects an unmatched closing parenthesis', () =>
  assert.equal(eq('1px)', '2px)'), false));
test('isShapeEquivalent rejects bad strings', () =>
  assert.equal(eq('"a\n', '"a\n', 'content'), false));
test('isShapeEquivalent rejects bad urls', () =>
  assert.equal(eq('url(a b)', 'url(a b)', 'background'), false));
test('isShapeEquivalent requires identical numbers for font', () =>
  assert.equal(eq('400 1px', '450 1px', 'font'), false));
test('isShapeEquivalent requires identical numbers for font-weight regardless of case', () =>
  assert.equal(eq('400', '450', 'FONT-WEIGHT'), false));
test('isShapeEquivalent accepts percentage magnitudes', () =>
  assert.equal(eq('10%', '20%'), true));
// Older parsers reject scientific notation, so the plain value stays as fallback
test(
  'margin-top is kept before a later value in scientific notation',
  keeps('margin-top:1px;margin-top:1e1px')
);
test(
  'border-top-width is kept before a later value in scientific notation',
  keeps('border-top-width:1px;border-top-width:1e1px')
);
test(
  'overridden margin-top in scientific notation is discarded by a later one',
  discards('margin-top:1e1px;margin-top:2e1px', 'margin-top:2e1px')
);
