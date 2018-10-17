import test from 'ava';
import postcss from 'postcss';
import cssnano from '..';

test('should support `env()` and `constant()` is an iPhone X-only feature', t => {
    const css = `
    @supports (height: env(safe-area-inset-bottom)) {
      .footer {
        padding-bottom: calc(env(safe-area-inset-bottom) * 3) !important;
      }
    }
    `;
    return postcss([cssnano]).process(css).then(result => {
        t.deepEqual(result.css, '@supports (height:env(safe-area-inset-bottom)){.footer{padding-bottom:calc(env(safe-area-inset-bottom)*3)!important}}');
    });
});
