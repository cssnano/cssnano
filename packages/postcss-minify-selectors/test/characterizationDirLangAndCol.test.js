import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeList, specificityOf } from '../src/lib/selectorScanner.js';

test('normalizes :dir() argument by trimming whitespace and preserving important comments', () => {
  assert.equal(normalizeList(':dir(  ltr  )', false, false), ':dir(ltr)');
  assert.equal(normalizeList(':dir( rtl )', false, false), ':dir(rtl)');
  assert.equal(
    normalizeList(':dir( /*! preserved */ ltr )', false, false),
    ':dir(/*! preserved */ltr)'
  );
  assert.equal(
    normalizeList(':dir( ltr /*! preserved */ )', false, false),
    ':dir(ltr/*! preserved */)'
  );
  assert.equal(
    normalizeList(':dir( /* ordinary */ ltr )', false, false),
    ':dir(ltr)'
  );
});

test('preserves invalid :dir() syntax without modification', () => {
  for (const input of [
    ':dir()',
    ':dir(   )',
    ':dir(ltr, rtl)',
    ':dir(ltr rtl)',
    ':dir("ltr")',
    ':dir(123)',
    ':dir(ltr > rtl)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('calculates pseudo-class specificity for :dir()', () => {
  assert.equal(specificityOf(':dir(ltr)'), '0,1,0');
  assert.equal(specificityOf('article.item:dir(rtl)'), '0,2,1');
});

test('normalizes :lang() arguments with whitespace trimming, unquoting, and deduplication', () => {
  assert.equal(normalizeList(':lang( en , fr )', false, false), ':lang(en,fr)');
  assert.equal(
    normalizeList(':lang("en", \'fr\')', false, false),
    ':lang(en,fr)'
  );
  assert.equal(normalizeList(':lang("zh-*")', false, false), ':lang("zh-*")');
  assert.equal(normalizeList(':lang(en, en)', false, false), ':lang(en)');
  assert.equal(normalizeList(':lang(en, "en")', false, false), ':lang(en)');
  assert.equal(
    normalizeList(':lang(en, fr, en)', false, false),
    ':lang(en,fr)'
  );
  assert.equal(
    normalizeList(':lang( /*! preserved */ en , "fr" )', false, false),
    ':lang(/*! preserved */en,fr)'
  );
});

test('preserves invalid :lang() argument lists without modification', () => {
  for (const input of [
    ':lang()',
    ':lang(   )',
    ':lang(,)',
    ':lang(,en)',
    ':lang(en,)',
    ':lang(en,,fr)',
    ':lang(en fr)',
    ':lang(123)',
    ':lang(en > fr)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('calculates pseudo-class specificity for :lang()', () => {
  assert.equal(specificityOf(':lang(en)'), '0,1,0');
  assert.equal(specificityOf(':lang(en, fr)'), '0,1,0');
  assert.equal(specificityOf('div.card:lang("zh-*")'), '0,2,1');
});

test('normalizes wide :lang() argument lists in linear time', () => {
  const count = 1000;
  const items = Array.from({ length: count }, (_, i) => ` "lang-${i}" `);
  const input = `:lang(${items.join(',')})`;
  const start = performance.now();
  const output = normalizeList(input, false, false);
  const elapsed = performance.now() - start;
  assert.ok(output.startsWith(':lang(lang-0,lang-1,'));
  assert.ok(elapsed < 100, `Expected < 100ms, took ${elapsed.toFixed(1)}ms`);
});

test('normalizes :nth-col() and :nth-last-col() An+B formulas', () => {
  assert.equal(
    normalizeList(':nth-col(2n + 1)', false, false),
    ':nth-col(odd)'
  );
  assert.equal(normalizeList(':nth-col(even)', false, false), ':nth-col(2n)');
  assert.equal(
    normalizeList(':nth-last-col(2n + 1)', false, false),
    ':nth-last-col(odd)'
  );
  assert.equal(
    normalizeList(':nth-last-col(even)', false, false),
    ':nth-last-col(2n)'
  );
});

test('rejects of clauses in :nth-col() and :nth-last-col() preserving exact source', () => {
  for (const input of [
    ':nth-col(1 of .a)',
    ':nth-col(even of div)',
    ':nth-last-col(1 of .a)',
    ':nth-last-col(2n of span)',
  ]) {
    assert.equal(normalizeList(input, false, false), input, input);
  }
});

test('does not convert :nth-col(1) or :nth-last-col(1) to nonexistent first/last-col pseudos', () => {
  assert.equal(normalizeList(':nth-col(1)', false, false), ':nth-col(1)');
  assert.equal(
    normalizeList(':nth-last-col(1)', false, false),
    ':nth-last-col(1)'
  );
});

test('calculates pseudo-class specificity for :nth-col() and :nth-last-col()', () => {
  assert.equal(specificityOf(':nth-col(odd)'), '0,1,0');
  assert.equal(specificityOf('table.data:nth-last-col(2n)'), '0,2,1');
});
