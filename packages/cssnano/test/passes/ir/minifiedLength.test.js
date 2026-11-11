import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { minifiedLength } from '../../../src/passes/ir/minifiedLength.js';
import { recordDeclaration } from '../../../src/passes/merge/lib/rules/buildRecords.js';

// A declaration takes its name, its value, the colon and the separator after it;
// the `!important` flag adds ten bytes. The lengths are read from the records of
// a run, which is how the merge pass measures them.
function lengthOf(css) {
  const context = createRunContext();
  const node = postcss.parse(`a{${css}}`).first.first;
  return minifiedLength(context.tokenLists, recordDeclaration(node, context));
}

test('minifiedLength counts the name, value, colon and separator of a declaration', () => {
  assert.strictEqual(lengthOf('color:red'), 'color'.length + 'red'.length + 2);
});

test('minifiedLength adds ten bytes for !important', () => {
  assert.strictEqual(
    lengthOf('color:red!important'),
    lengthOf('color:red') + 10
  );
});

test('minifiedLength counts the vendor prefix and hack prefix bytes of the property name', () => {
  assert.strictEqual(
    lengthOf('-webkit-transform:none'),
    '-webkit-transform'.length + 'none'.length + 2
  );
});

test('minifiedLength counts the bytes of a value with a comment as the cleaned value', () => {
  // PostCSS strips the comment and keeps both spaces: the cleaned value is `0  0`.
  assert.strictEqual(lengthOf('margin:0 /* c */ 0'), lengthOf('margin:0  0'));
});
