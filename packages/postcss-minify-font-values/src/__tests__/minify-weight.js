import minifyWeight from '../lib/minify-weight';

test('minify-weight', () => {
  expect(minifyWeight('normal')).toBe('400');
  expect(minifyWeight('bold')).toBe('700');
  expect(minifyWeight('lighter')).toBe('lighter');
  expect(minifyWeight('bolder')).toBe('bolder');
});
