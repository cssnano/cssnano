import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processor } = processCSSFactory(plugin);

describe('Pathological payload resilience', () => {
  // Repeated XML comments followed by an unclosed root tag previously sent
  // fragment extraction into exponential backtracking. The payload below took
  // multiple seconds; linear extraction finishes in single-digit milliseconds,
  // leaving a wide margin for slow CI runners. The comments are
  // percent-encoded so the pass-through expectation is not perturbed by
  // PostCSS reserializing literal '<!--' inside strings.
  test('should stay linear on many XML comments with an unclosed root tag', async () => {
    const payload =
      '%3c!-- comment --%3e'.repeat(25) + '<svg><circle/>' + '#frag';
    const css = `h1{background:url("data:image/svg+xml,${payload}")}`;

    const start = performance.now();
    const result = await processor(css);
    const elapsed = performance.now() - start;

    assert.ok(
      elapsed < 1000,
      `took ${elapsed.toFixed(0)}ms, expected linear time`
    );
    assert.strictEqual(result.css, css);
    assert.ok(result.warnings().length > 0);
  });

  // Locating the last root close tag previously rescanned the remainder of the
  // payload per candidate (quadratic). The stray close tags make svgo abort
  // immediately, so the remaining cost isolates fragment extraction, which
  // took ~400ms; linear extraction keeps it in single-digit milliseconds.
  test('should stay linear on many root close tags', async () => {
    const payload = '<svg><circle/>' + '</svg>'.repeat(4000) + '#frag';
    const css = `h1{background:url("data:image/svg+xml,${payload}")}`;

    const start = performance.now();
    const result = await processor(css);
    const elapsed = performance.now() - start;

    assert.ok(
      elapsed < 300,
      `took ${elapsed.toFixed(0)}ms, expected linear time`
    );
    assert.strictEqual(result.css, css);
    assert.ok(result.warnings().length > 0);
  });
});
