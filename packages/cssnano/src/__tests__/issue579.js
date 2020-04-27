import postcss from 'postcss';
import cssnano from '..';

jest.setTimeout(30000);

test('should support `env()` and `constant()` is an iPhone X-only feature', () => {
  const css = `
    @supports (height: env(safe-area-inset-bottom)) {
      .footer {
        padding-bottom: calc(env(safe-area-inset-bottom) * 3) !important;
      }
    }
    `;

  return postcss([cssnano])
    .process(css, { from: undefined })
    .then((result) => {
      expect(result.css).toBe(
        '@supports (height:env(safe-area-inset-bottom)){.footer{padding-bottom:calc(env(safe-area-inset-bottom)*3)!important}}'
      );
    });
});
