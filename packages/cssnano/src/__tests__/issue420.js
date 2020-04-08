import postcss from 'postcss';
import fontMagician from 'postcss-font-magician';
import cssnano from '..';

test('should work with postcss-font-magician with `display` parameter', () => {
  const css = `
    body {
      font-family: "Alice";
    }
    `;

  return postcss([fontMagician({ display: 'optional' }), cssnano])
    .process(css, { from: undefined })
    .then((result) => {
      expect(result.css).toMatchInlineSnapshot(
        `"@font-face{src:local(\\"Alice Regular\\"),local(Alice-Regular),url(//fonts.gstatic.com/s/alice/v11/OpNCnoEEmtHa6GcOrgo.eot#) format(\\"eot\\"),url(//fonts.gstatic.com/s/alice/v11/OpNCnoEEmtHa6GcOrg4.woff2) format(\\"woff2\\"),url(//fonts.gstatic.com/s/alice/v11/OpNCnoEEmtHa6GcOrgg.woff) format(\\"woff\\");font-display:optional;font-family:Alice;font-style:normal;font-weight:400}body{font-family:Alice}"`
      );
    });
});
