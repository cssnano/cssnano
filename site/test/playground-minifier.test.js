import { test } from 'node:test';
import assert from 'node:assert';
import { minimize } from '../src/playground-minifier.js';

test('minimize returns the minified CSS', async () => {
  const reply = await minimize('a { color: red; }', 'default');
  assert.deepStrictEqual(reply, { ok: true, css: 'a{color:red}' });
});

test('minimize reports the syntax error line and column for invalid input CSS', async () => {
  const reply = await minimize('a { color: red', 'default');
  assert.strictEqual(reply.ok, false);
  assert.match(reply.error.message, / at line \d+, column \d+$/v);
});

test('minimize leaves the "Error" label to the caller, so the UI does not say it twice', async () => {
  const reply = await minimize('a { color: red', 'default');
  assert.doesNotMatch(reply.error.message, /^\w*Error\b/v);
});

test('minimize marks syntax errors as input errors', async () => {
  const reply = await minimize('a { color: red', 'default');
  assert.strictEqual(reply.error.input, true);
});

test('minimize does not mark an unknown preset as an input error', async () => {
  const reply = await minimize(
    'a { color: red; }',
    /** @type {any} */ ('invalid')
  );
  assert.strictEqual(reply.ok, false);
  assert.strictEqual(reply.error.input, false);
});

// The lite preset only strips whitespace and comments; the default preset
// also rewrites values, so their output differs for the same input.
test('minimize applies the selected preset, not a fixed one', async () => {
  const input = 'a { margin: 0px 0px 0px 0px; /* c */ }';
  const lite = await minimize(input, 'lite');
  const standard = await minimize(input, 'default');
  assert.notDeepStrictEqual(lite, standard);
});

// The worker posts its reply with postMessage, which copies it with structuredClone.
test('minimize success reply survives structured cloning', async () => {
  const reply = await minimize('a { color: red; }', 'default');
  assert.deepStrictEqual(structuredClone(reply), reply);
});

test('minimize error reply survives structured cloning', async () => {
  const reply = await minimize('a { color: red', 'default');
  assert.deepStrictEqual(structuredClone(reply), reply);
});
