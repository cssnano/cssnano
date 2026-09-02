import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { edgeCases, generate, properties } from '../script/lib/fuzzGenerate.js';

function process(css, processor = postcss([plugin()])) {
  return processor.process(css, { from: undefined }).css;
}

test('ordered-value generation covers every branch and varied values', () => {
  const branches = new Set();
  const values = new Set();
  const features = new Set();
  for (const seed of [1, 2, 3]) {
    for (const sample of generate(seed, 500)) {
      branches.add(sample.branch);
      values.add(sample.semanticKey);
      for (const feature of sample.features) features.add(feature);
      assert.doesNotThrow(() => process(sample.css));
    }
  }
  assert.deepEqual(
    [...branches].toSorted(),
    properties.map(([name]) => name).toSorted()
  );
  assert.ok(
    values.size >= 100,
    `expected at least 100 semantic values, got ${values.size}`
  );
  for (const feature of [
    'comma',
    'slash',
    'nested-function',
    'url',
    'quoted-url',
    'string',
    'escape',
    'block',
  ]) {
    assert.ok(features.has(feature), `missing generated feature: ${feature}`);
  }
});

test('generated values are safe, idempotent, and processor-lifetime independent', () => {
  const reused = postcss([plugin()]);
  for (const sample of generate(17, 1200)) {
    const output = process(sample.css, reused);
    assert.equal(process(output), output, `${sample.branch}: ${sample.css}`);
    assert.equal(
      process(sample.css),
      output,
      `${sample.branch}: fresh processor`
    );
  }
});

test('repeated declarations use the same result without changing output', () => {
  const input =
    'a{border:red solid 1px;border:red solid 1px;outline:solid red 1px;outline:solid red 1px}';
  const processor = postcss([plugin()]);
  const output = process(input, processor);
  assert.equal(
    output,
    'a{border:1px solid red;border:1px solid red;outline:1px solid red;outline:1px solid red}'
  );
  assert.equal(process(output, processor), output);
});

test('abort cases preserve declaration values byte-for-byte', () => {
  for (const sample of edgeCases.slice(0, 3)) {
    const inputValue = sample.css.match(/:(.*)}/s)?.[1] ?? '';
    const output = process(sample.css);
    const outputValue = output.match(/:(.*)}/s)?.[1] ?? '';
    assert.equal(outputValue, inputValue, sample.name);
  }
});

test('edge syntax remains processable and idempotent', () => {
  for (const sample of edgeCases.slice(3)) {
    const output = process(sample.css);
    assert.equal(process(output), output, sample.name);
  }
});
