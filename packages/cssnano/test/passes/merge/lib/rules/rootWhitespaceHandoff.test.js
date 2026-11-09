import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { repositoryFile } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';

const plugin = transformPlugin('mergeRules');

/** @param {string} css */
function merge(css) {
  return postcss([plugin]).process(css, { from: repositoryFile }).css;
}

// The leading whitespace of the stylesheet is the whitespace of its first
// child. It stays with the stylesheet when a join moves the first child and
// when a sweep rebuilds the stylesheet afterwards.

test('should keep the leading whitespace of the stylesheet after a join moves its first child and a sweep rebuilds it', () => {
  assert.equal(
    merge(
      '\n\n.c#i{--V:red}\n  @supports (color:red){span.a{margin-left:0}}\n  .c#i{margin-top:0;margin-left:0}\n  span,div::before{--V:red;margin-left:0}'
    ),
    '\n  @supports (color:red){span.a{margin-left:0}}\n  .c#i{margin-top:0}\n  .c#i,span,div::before{--V:red;margin-left:0}'
  );
});

test('should keep the leading whitespace of the stylesheet after two joins move its first child in turn and a sweep rebuilds it', () => {
  assert.equal(
    merge(
      '\n\n\n@media print{a{top:0}}\n @media tv{a{left:0}}\n  @media screen{a{color:blue}}\n   @media print{a{color:red}}\n    @media tv{a{color:red}}\n     .x#i{--V:red}\n      @supports (color:red){span.a{margin-left:0}}\n       .x#i{margin-top:0;margin-left:0}\n        span,div::before{--V:red;margin-left:0}'
    ),
    '\n    @media screen{a{color:blue}}\n   @media print{a{top:0;color:red}}\n    @media tv{a{left:0;color:red}}\n      @supports (color:red){span.a{margin-left:0}}\n       .x#i{margin-top:0}\n        .x#i,span,div::before{--V:red;margin-left:0}'
  );
});
