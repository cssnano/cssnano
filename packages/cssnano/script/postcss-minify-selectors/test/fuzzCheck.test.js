import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { matchElements } from '../lib/fuzzCheck.js';

const tree = {
  html: '<a data-fz="1"></a><a class="foo" data-fz="2"></a>',
  css: '',
};

describe('matchElements pseudo-element matches', () => {
  test('matches the originating element of a pseudo-element', () => {
    assert.deepEqual(
      matchElements('a.foo::before', tree).ids,
      new Set(['2::before'])
    );
  });

  test('tells a pseudo-element apart from its originating element', () => {
    assert.deepEqual(
      matchElements('a.foo, a.foo::after', tree).ids,
      new Set(['2', '2::after'])
    );
  });

  test('treats the legacy single-colon form as the same pseudo-element', () => {
    assert.deepEqual(
      matchElements('a.foo:before', tree).ids,
      new Set(['2::before'])
    );
  });

  test('queries a bare pseudo-element on every element', () => {
    assert.deepEqual(
      matchElements('::after', tree).ids,
      new Set(['1::after', '2::after'])
    );
  });

  test('queries a pseudo-element after a combinator on every descendant', () => {
    assert.deepEqual(
      matchElements('body > ::after', tree).ids,
      new Set(['1::after', '2::after'])
    );
  });
});

describe('matchElements pseudo-element keys', () => {
  test('tells functional pseudo-elements apart by their argument', () => {
    assert.deepEqual(
      matchElements('a.foo::part(x)', tree).ids,
      new Set(['2::part(x)'])
    );
  });

  test('checks the originating element of a pseudo-element followed by a pseudo-class', () => {
    assert.deepEqual(
      matchElements('a.foo::before:hover', tree).ids,
      new Set(['2::before:hover'])
    );
  });
});

const foreignTree = {
  html: '<a title="svg|a" data-fz="1"></a><svg data-fz="2"><a data-fz="3"></a></svg>',
  css: '',
};

describe('matchElements namespace prefixes', () => {
  test('matches a prefixed type selector in that namespace only', () => {
    assert.deepEqual(matchElements('svg|a', foreignTree).ids, new Set(['3']));
  });

  test('matches a prefixed universal selector in that namespace only', () => {
    assert.deepEqual(
      matchElements('svg|*', foreignTree).ids,
      new Set(['2', '3'])
    );
  });

  test('leaves a prefix-like attribute value as written', () => {
    assert.deepEqual(
      matchElements('[title="svg|a"]', foreignTree).ids,
      new Set(['1'])
    );
  });
});

describe('matchElements errors', () => {
  test('names the selector parser when it rejects a selector', () => {
    assert.match(matchElements('a[', tree).error ?? '', /selector parser/v);
  });

  test('names querySelectorAll when only the DOM rejects a selector', () => {
    assert.match(
      matchElements('a:unknown-pseudo', tree).error ?? '',
      /querySelectorAll/v
    );
  });
});
