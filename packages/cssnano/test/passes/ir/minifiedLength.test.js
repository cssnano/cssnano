import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { minifiedLength } from '../../../src/passes/ir/minifiedLength.js';

// A declaration takes its name, its value, the colon and the separator after it;
// the `!important` flag adds ten bytes.
function declarationOf(css) {
  return postcss.parse(`a{${css}}`).first.first;
}

test('minifiedLength counts the name, value, colon and separator of a declaration', () => {
  assert.strictEqual(
    minifiedLength(declarationOf('color:red')),
    'color'.length + 'red'.length + 2
  );
});

test('minifiedLength adds ten bytes for !important', () => {
  assert.strictEqual(
    minifiedLength(declarationOf('color:red!important')),
    minifiedLength(declarationOf('color:red')) + 10
  );
});

test('minifiedLength counts the vendor prefix and hack prefix bytes of the property name', () => {
  assert.strictEqual(
    minifiedLength(declarationOf('-webkit-transform:none')),
    '-webkit-transform'.length + 'none'.length + 2
  );
});
