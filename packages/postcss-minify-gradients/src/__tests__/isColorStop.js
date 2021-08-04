import isColorStop from '../isColorStop.js';

test('should recognise color stops', () => {
  expect(isColorStop('yellow')).toBe(true);
  expect(isColorStop('yellow', '12px')).toBe(true);
  expect(isColorStop('yellow', 'px')).toBe(false);
  expect(isColorStop('yellow', 'calc(100%)')).toBe(true);
  expect(isColorStop(undefined)).toBe(false);
});
