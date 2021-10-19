import valueParser from 'postcss-value-parser';
import normalizeBorder from '../rules/border.js';
import normalizeBoxShadow from '../rules/boxShadow.js';

describe('orders borders', () => {
  test('handles max', () => {
    expect(normalizeBorder(valueParser('red max(3em, 48px)'))).toBe(
      'max(3em, 48px)  red'
    );
  });

  test('handles mixed color and width functions', () => {
    expect(
      normalizeBorder(
        valueParser('rgba(0, 50, 50, 0.4) solid clamp(3em, 0.5vw, 48px)')
      )
    ).toBe('clamp(3em, 0.5vw, 48px) solid rgba(0, 50, 50, 0.4)');
  });
});

describe('orders box shadows', () => {
  test('handles functions in box shadows', () => {
    expect(
      normalizeBoxShadow(valueParser('inset 0 min(1em, 1px) 0 1px red'))
    ).toBe('inset 0 min(1em, 1px) 0 1px red');
  });
});
