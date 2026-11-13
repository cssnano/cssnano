import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { recordDeclaration } from '../../../src/passes/ir/buildRecords.js';
import { tokensText } from '../../../src/values/tokensText.js';

/**
 * @param {string} css one declaration
 * @return {import('postcss').Declaration}
 */
function declarationOf(css) {
  return /** @type {import('postcss').Declaration} */ (
    postcss.parse(`a{${css}}`).first.first
  );
}

/**
 * The key of a declaration, in a run that holds the keys of the other
 * declarations the test gives it.
 *
 * @param {ReturnType<typeof createRunContext>} context
 * @param {string} css
 * @return {number}
 */
function keyIn(context, css) {
  return recordDeclaration(declarationOf(css), context).id;
}

test('should give equal declarations the same key', () => {
  const context = createRunContext();
  assert.equal(keyIn(context, 'color:red'), keyIn(context, 'color:red'));
});

test('should give declarations that differ only in a hack prefix different keys', () => {
  const context = createRunContext();
  assert.notEqual(keyIn(context, '*zoom:1'), keyIn(context, 'zoom:1'));
});

test('should give declarations that differ only in importance different keys', () => {
  const context = createRunContext();
  assert.notEqual(
    keyIn(context, 'color:red!important'),
    keyIn(context, 'color:red')
  );
});

test('should fold the ASCII case of a standard property name', () => {
  const context = createRunContext();
  assert.equal(keyIn(context, 'COLOR:red'), keyIn(context, 'color:red'));
});

test('should keep the case of a custom property name', () => {
  const context = createRunContext();
  assert.notEqual(keyIn(context, '--Foo:1'), keyIn(context, '--foo:1'));
});

test('should give the same key to a declaration that has no raws.before', () => {
  const context = createRunContext();
  const bare = declarationOf('color:red');
  delete bare.raws.before;
  assert.equal(
    recordDeclaration(bare, context).id,
    keyIn(context, 'color:red')
  );
});

test('should give a declaration with important false the key of one without importance', () => {
  const context = createRunContext();
  const explicit = declarationOf('color:red');
  explicit.important = false;
  assert.equal(
    recordDeclaration(explicit, context).id,
    keyIn(context, 'color:red')
  );
});

test('should key a plain comment between values by the cleaned value, which keeps both spaces', () => {
  // PostCSS strips the comment and keeps the spaces around it: the cleaned value is `0  0`.
  const context = createRunContext();
  assert.equal(
    keyIn(context, 'margin:0 /* c */ 0'),
    keyIn(context, 'margin:0  0')
  );
});

test('should give margin with an important comment between its values a different key', () => {
  // The value as written keeps the important comment, so it is not the value without it.
  const context = createRunContext();
  assert.notEqual(
    keyIn(context, 'margin:0 /*! c */ 0'),
    keyIn(context, 'margin:0 0')
  );
});

test('should key a string containing the important marker by its cleaned value, not as written', () => {
  // The marker is inside a string, and the comment after it is plain: the
  // declaration has no important comment, so it is the same as the string alone.
  const context = createRunContext();
  assert.equal(
    keyIn(context, 'content:"/*!" /*c*/'),
    keyIn(context, 'content:"/*!"')
  );
});

test('should give values that differ only in spelling different keys', () => {
  const context = createRunContext();
  assert.notEqual(keyIn(context, 'width:1.0px'), keyIn(context, 'width:1px'));
});

test('a declaration record points at a list that spells the value of its declaration', () => {
  const context = createRunContext();
  const node = declarationOf('width:10px');
  const record = recordDeclaration(node, context);
  assert.equal(
    tokensText(context.tokenLists.get(record.valueList)),
    node.value
  );
});
