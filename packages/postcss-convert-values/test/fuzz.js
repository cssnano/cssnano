import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';
import { check } from '../script/lib/fuzzCheck.js';
import { edgeCases, generate } from '../script/lib/fuzzGenerate.js';

const processor = postcss([plugin()]);

describe('Fuzzing & Invariant Testing', () => {
  test('edge cases remain processable, safe, and idempotent', () => {
    for (const sample of edgeCases) {
      const failure = check(sample.css, sample.branch);
      assert.equal(
        failure,
        undefined,
        failure ? `${failure.reason} for input: ${failure.css}` : ''
      );
    }
  });

  test('fuzzer covers diverse grammar branches without invariant violations', () => {
    const branches = new Set();
    const values = new Set();
    const features = new Set();

    for (const seed of [1, 2, 3]) {
      for (const sample of generate(seed, 300)) {
        branches.add(sample.branch);
        values.add(sample.semanticKey);
        for (const feature of sample.features) {
          features.add(feature);
        }

        const failure = check(sample.css, sample.branch);
        assert.equal(
          failure,
          undefined,
          failure ? `${failure.reason} on ${sample.branch}: ${sample.css}` : ''
        );
      }
    }

    assert.ok(branches.has('at-property'), 'missing at-property branch');
    assert.ok(branches.has('flex'), 'missing flex branch');
    assert.ok(branches.has('angle'), 'missing angle branch');
    assert.ok(branches.has('math-functions'), 'missing math-functions branch');
    assert.ok(branches.has('time'), 'missing time branch');
    assert.ok(branches.has('length'), 'missing length branch');
    assert.ok(
      values.size >= 50,
      `expected at least 50 semantic values, got ${values.size}`
    );
  });

  test('repeated identical declarations reuse cache correctly without corruption', async () => {
    const input =
      'a{flex-basis:192px} b{flex-basis:192px} c{transform:rotate(0rad)} d{transform:rotate(0rad)}';
    const output = (await processor.process(input, { from: undefined })).css;
    assert.equal(
      output,
      'a{flex-basis:2in} b{flex-basis:2in} c{transform:rotate(0deg)} d{transform:rotate(0deg)}'
    );
    const second = (await processor.process(output, { from: undefined })).css;
    assert.equal(second, output);
  });

  test('synchronizes stale raw metadata on cache hits', async () => {
    /** @type {import('postcss').Declaration[]} */
    const decls = [];
    const pipeline = postcss([
      {
        postcssPlugin: 'setup-stale',
        Declaration(decl) {
          decls.push(decl);
          if (decls.length === 2) {
            decl.value = '10px';
            decl.raws.value = { raw: '20px', value: '20px' };
          }
        },
      },
      plugin(),
    ]);

    const result = await pipeline.process('a{width:10px} b{width:10px}', {
      from: undefined,
    });
    assert.ok(
      !result.css.includes('20px'),
      'stale raw metadata was retained on cache hit'
    );
    assert.equal(decls[1]?.raws?.value?.raw, '10px');
  });
});
