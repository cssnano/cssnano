import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeList, specificityOf } from '../src/lib/selectorScanner.js';
import { assertScaling } from './helpers/scalingHelper.js';

test('normalizes ::part() arguments with whitespace compression and comment preservation', () => {
  assert.equal(
    normalizeList('::part(  tab   active  )', false, false),
    '::part(tab active)'
  );
  assert.equal(normalizeList('::part( tab )', false, false), '::part(tab)');
  assert.equal(
    normalizeList('::part( /*! preserved */ tab active )', false, false),
    '::part(/*! preserved */tab active)'
  );
  assert.equal(
    normalizeList('::part( tab /*! preserved */ active )', false, false),
    '::part(tab/*! preserved */ active)'
  );
  assert.equal(
    normalizeList('::part( /* ordinary */ tab active )', false, false),
    '::part(tab active)'
  );
});

test('preserves invalid ::part() syntax without modification', () => {
  for (const input of [
    '::part()',
    '::part(   )',
    '::part(123)',
    '::part("tab")',
    '::part(tab, active)',
    '::part(.tab)',
    '::part(tab > active)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('calculates element specificity for ::part() without adding pseudo-class specificity', () => {
  assert.equal(specificityOf('::part(tab)'), '0,0,1');
  assert.equal(specificityOf('::part(tab active)'), '0,0,1');
  assert.equal(specificityOf('div.card::part(tab)'), '0,1,2');
  assert.equal(specificityOf('#main::part(tab active)'), '1,0,1');
});

test('normalizes wide ::part() argument lists in linear time', () => {
  assertScaling([1_000, 2_000, 4_000], (count) => {
    const items = Array.from({ length: count }, (_, i) => `part-${i}`);
    return {
      input: `::part( ${items.join('   ')} )`,
      validate(output) {
        assert.ok(output.startsWith('::part(part-0 part-1 '));
      },
      sort: false,
      convertToIs: false,
    };
  });
});

test('normalizes ::highlight() argument by trimming whitespace and preserving comments', () => {
  assert.equal(
    normalizeList('::highlight(  search-result  )', false, false),
    '::highlight(search-result)'
  );
  assert.equal(
    normalizeList(
      '::highlight( /*! preserved */ search-result )',
      false,
      false
    ),
    '::highlight(/*! preserved */search-result)'
  );
  assert.equal(
    normalizeList('::highlight( /* ordinary */ search-result )', false, false),
    '::highlight(search-result)'
  );
});

test('preserves invalid ::highlight() syntax without modification', () => {
  for (const input of [
    '::highlight()',
    '::highlight(   )',
    '::highlight(a b)',
    '::highlight("search-result")',
    '::highlight(123)',
    '::highlight(a, b)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('calculates element specificity for ::highlight()', () => {
  assert.equal(specificityOf('::highlight(search-result)'), '0,0,1');
  assert.equal(specificityOf('p::highlight(search-result)'), '0,0,2');
});

test('normalizes ::view-transition-*() arguments by trimming whitespace and preserving comments', () => {
  assert.equal(
    normalizeList('::view-transition-old(  header  )', false, false),
    '::view-transition-old(header)'
  );
  assert.equal(
    normalizeList('::view-transition-new(  *  )', false, false),
    '::view-transition-new(*)'
  );
  assert.equal(
    normalizeList('::view-transition-group( root )', false, false),
    '::view-transition-group(root)'
  );
  assert.equal(
    normalizeList('::view-transition-image-pair( banner )', false, false),
    '::view-transition-image-pair(banner)'
  );
  assert.equal(
    normalizeList('::view-transition-group-children( card )', false, false),
    '::view-transition-group-children(card)'
  );
  assert.equal(
    normalizeList(
      '::view-transition-old( /*! preserved */ header )',
      false,
      false
    ),
    '::view-transition-old(/*! preserved */header)'
  );
  assert.equal(
    normalizeList('::view-transition-new( /* ordinary */ * )', false, false),
    '::view-transition-new(*)'
  );
});

test('preserves invalid ::view-transition-*() syntax without modification', () => {
  for (const input of [
    '::view-transition-old()',
    '::view-transition-new(   )',
    '::view-transition-group(header banner)',
    '::view-transition-image-pair("header")',
    '::view-transition-old(123)',
    '::view-transition-new(* *)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('calculates element specificity for ::view-transition-*()', () => {
  assert.equal(specificityOf('::view-transition-old(header)'), '0,0,1');
  assert.equal(specificityOf('::view-transition-new(*)'), '0,0,0');
  assert.equal(specificityOf('::view-transition-new(*.card)'), '0,0,1');
  assert.equal(specificityOf('html::view-transition-group(root)'), '0,0,2');
});

test('normalizes :state() argument by trimming whitespace and preserving comments', () => {
  assert.equal(
    normalizeList(':state(  checked  )', false, false),
    ':state(checked)'
  );
  assert.equal(
    normalizeList(':state( /*! preserved */ checked )', false, false),
    ':state(/*! preserved */checked)'
  );
  assert.equal(
    normalizeList(':state( /* ordinary */ checked )', false, false),
    ':state(checked)'
  );
});

test('preserves invalid :state() syntax without modification', () => {
  for (const input of [
    '::state()',
    ':state(   )',
    ':state(checked open)',
    ':state("checked")',
    ':state(123)',
    ':state(checked, open)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('calculates pseudo-class specificity for :state()', () => {
  assert.equal(specificityOf(':state(checked)'), '0,1,0');
  assert.equal(specificityOf('button:state(checked)'), '0,1,1');
  assert.equal(specificityOf('form.login button:state(checked)'), '0,2,2');
});

test('calculates specificity for ::slotted() without double-counting pseudo-class specificity', () => {
  assert.equal(specificityOf('::slotted(span)'), '0,0,2');
  assert.equal(specificityOf('::slotted(.a)'), '0,1,1');
  assert.equal(specificityOf('slot::slotted(div.card)'), '0,1,3');
});

test('preserves escape terminators when legacy output requires them', () => {
  for (const [input, expected] of [
    ['.\\61 :hover', '.\\61 :hover'],
    ['.\\61 [data-x]', '.\\61 [data-x]'],
    ['.\\61 > .item', '.\\61 >.item'],
    ['.\\61  > .item', '.\\61>.item'],
    ['.\\61 , .item', '.\\61,.item'],
  ])
    assert.equal(normalizeList(input, false, false), expected, input);
});

test('preserves an invalid qualified name after a simple selector', () => {
  const input = '.item\\e0000\\e001 |name';
  assert.equal(normalizeList(input, false, false), input);
});
