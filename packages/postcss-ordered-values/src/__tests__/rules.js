import valueParser from 'postcss-value-parser';
import normalizeBorder from '../rules/border.js';

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
