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
        t.deepEqual(result.css, `@font-face{font-family:Alice;font-style:normal;font-weight:400;src:local(Alice),local(Alice-Regular),url(//fonts.gstatic.com/s/alice/v7/sZyKh5NKrCk1xkCk_F1S8A.eot#) format("eot"),url(//fonts.gstatic.com/s/alice/v7/_H4kMcdhHr0B8RDaQcqpTA.woff) format("woff2"),url(//fonts.gstatic.com/s/alice/v7/_H4kMcdhHr0B8RDaQcqpTA.woff) format("woff")}body{font-family:Alice}`);
    });
});
