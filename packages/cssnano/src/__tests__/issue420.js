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
      expect(result.css).toBe(
        '@font-face{font-family:Alice;font-style:normal;font-weight:400;src:local("Alice Regular"),local(Alice-Regular),url(//fonts.gstatic.com/s/alice/v9/OpNCnoEEmtHa6GcOrgo.eot#) format("eot"),url(//fonts.gstatic.com/s/alice/v9/OpNCnoEEmtHa6GcOrg4.woff2) format("woff2"),url(//fonts.gstatic.com/s/alice/v9/OpNCnoEEmtHa6GcOrgg.woff) format("woff");font-display:optional}body{font-family:Alice}'
      );
      // Switch back once css-declaration-sorter has been fixed
      // @font-face{font-display:optional;font-family:Alice;font-style:normal;font-weight:400;src:local("Alice Regular"),local(Alice-Regular),url(//fonts.gstatic.com/s/alice/v9/OpNCnoEEmtHa6GcOrgo.eot#) format("eot"),url(//fonts.gstatic.com/s/alice/v9/OpNCnoEEmtHa6GcOrg4.woff2) format("woff2"),url(//fonts.gstatic.com/s/alice/v9/OpNCnoEEmtHa6GcOrgg.woff) format("woff")}body{font-family:Alice}
    });
});
