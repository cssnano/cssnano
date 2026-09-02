import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeValue } from '../src/lib/tokenize.js';
import normalizeBorder from '../src/rules/border.js';
import normalizeBoxShadow from '../src/rules/boxShadow.js';
import normalizeAnimation from '../src/rules/animation.js';

test('tokenization preserves escaped names and nested separators as one term', () => {
  const parsed = tokenizeValue('opacity 1s v\\61r(--x, min(1s, 2s))');

  assert.deepEqual(
    parsed.arguments.map((argument) => argument.map((term) => term.raw)),
    [['opacity', '1s', 'v\\61r(--x, min(1s, 2s))']]
  );
  assert.strictEqual(parsed.abort, true);
});

test('tokenization keeps bracketed names and quoted URLs atomic', () => {
  const parsed = tokenizeValue('[line name] url("a,b") 1fr');

  assert.deepEqual(
    parsed.terms.map((term) => term.raw),
    ['[line name]', 'url("a,b")', '1fr']
  );
});

describe('Border', () => {
  test('border order handles max', () => {
    assert.strictEqual(
      normalizeBorder(tokenizeValue('red max(3em, 48px)').terms),
      'max(3em, 48px)  red'
    );
  });

  test('border order handles mixed color and width functions', () => {
    assert.strictEqual(
      normalizeBorder(
        tokenizeValue('rgba(0, 50, 50, 0.4) solid clamp(3em, 0.5vw, 48px)')
          .terms
      ),
      'clamp(3em, 0.5vw, 48px) solid rgba(0, 50, 50, 0.4)'
    );
  });
});

test('ordering box shadows handles functions in box shadows', () => {
  assert.strictEqual(
    normalizeBoxShadow(tokenizeValue('inset 0 min(1em, 1px) 0 1px red')),
    'inset 0 min(1em, 1px) 0 1px red'
  );
});

describe('Animation', () => {
  test('animation order handles calc', () => {
    assert.strictEqual(
      normalizeAnimation(tokenizeValue('0ms opacity calc(1ms)')),
      'opacity 0ms calc(1ms)'
    );
  });

  test('animation order handles max', () => {
    assert.strictEqual(
      normalizeAnimation(tokenizeValue('0ms opacity max(-1 * 1ms, 1ms)')),
      'opacity 0ms max(-1 * 1ms, 1ms)'
    );
  });
});
