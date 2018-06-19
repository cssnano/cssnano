import test from 'ava';
import postcss from 'postcss';
import fontMagician from 'postcss-font-magician';
import cssnano from '..';

test('should work with postcss-font-magician', t => {
    const css = `
    body {
    	font-family: "Alice";
    }
    `;
    return postcss([fontMagician, cssnano]).process(css).then(result => {
        t.deepEqual(result.css, `@font-face{font-family:Alice;font-style:normal;font-weight:400;src:local("Alice Regular"),local(Alice-Regular),url(//fonts.gstatic.com/s/alice/v9/OpNCnoEEmtHa6GcOrgo.eot#) format("eot"),url(//fonts.gstatic.com/s/alice/v9/OpNCnoEEmtHa6GcOrg4.woff2) format("woff2"),url(//fonts.gstatic.com/s/alice/v9/OpNCnoEEmtHa6GcOrgg.woff) format("woff")}body{font-family:Alice}`);
    });
});
