import nodetest from 'node:test';
import assert from 'node:assert/strict';
import {
  getNumericUnit,
  parseComponentValues as valueParser,
  serializeComponentValues,
} from '../src/lib/parse.js';
import normalizeBorder from '../src/rules/border.js';
import normalizeBoxShadow from '../src/rules/boxShadow.js';
import normalizeAnimation from '../src/rules/animation.js';

const { describe, test } = nodetest;

test('numeric units identify numbers, dimensions, and percentages', () => {
  assert.deepEqual(getNumericUnit(valueParser('1')[0]), {
    number: '1',
    unit: '',
  });
  assert.deepEqual(getNumericUnit(valueParser('1px')[0]), {
    number: '1px',
    unit: 'px',
  });
  assert.deepEqual(getNumericUnit(valueParser('25%')[0]), {
    number: '25%',
    unit: '%',
  });
  assert.strictEqual(getNumericUnit(valueParser('red')[0]), undefined);
  assert.strictEqual(getNumericUnit(valueParser('solid')[0]), undefined);
});

test('component serialization preserves untouched source', () => {
  const nodes = valueParser('solid /* keep */ url(foo.png) 1px');
  assert.strictEqual(
    serializeComponentValues(nodes),
    'solid /* keep */ url(foo.png) 1px'
  );
});
describe('Border', () => {
  test('border order handles max', () => {
    assert.strictEqual(
      normalizeBorder(valueParser('red max(3em, 48px)')),
      'max(3em, 48px)  red'
    );
  });

  test('border order handles mixed color and width functions', () => {
    assert.strictEqual(
      normalizeBorder(
        valueParser('rgba(0, 50, 50, 0.4) solid clamp(3em, 0.5vw, 48px)')
      ),
      'clamp(3em, 0.5vw, 48px) solid rgba(0, 50, 50, 0.4)'
    );
  });
});

test('ordering box shadows handles functions in box shadows', () => {
  assert.strictEqual(
    normalizeBoxShadow(valueParser('inset 0 min(1em, 1px) 0 1px red')),
    'inset 0 min(1em, 1px) 0 1px red'
  );
});

describe('Animation', () => {
  test('animation order handles calc', () => {
    assert.strictEqual(
      normalizeAnimation(valueParser('0ms opacity calc(1ms)')),
      'opacity 0ms calc(1ms)'
    );
  });

  test('animation order handles max', () => {
    assert.strictEqual(
      normalizeAnimation(valueParser('0ms opacity max(-1 * 1ms, 1ms)')),
      'opacity 0ms max(-1 * 1ms, 1ms)'
    );
  });
});
