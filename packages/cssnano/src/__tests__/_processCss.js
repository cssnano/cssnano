import postcss from 'postcss';
import cssnano from '..';

export default function processCss(
  fixture,
  expected,
  options = { from: undefined }
) {
  return () =>
    postcss([cssnano])
      .process(fixture, options)
      .then(({ css }) => {
        expect(css).toBe(expected);
      });
}

export function passthrough(fixture, options = { from: undefined }) {
  return processCss(fixture, fixture, options);
}
