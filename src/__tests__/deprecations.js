import test from 'ava';
import hookStd from 'hook-std';
import toSentence from 'array-to-sentence';
import cssnano from '..';

function format (key) {
    return `opts.${key}`;
}

function deprecation (t, config, css = 'h1{}') {
    let out = '';
    const unhook = hookStd.stderr({silent: true}, output => (out += output));
    return cssnano.process(css, config).then(() => {
        unhook();
        t.truthy(out.trim().length);
    });
}

deprecation.title = (title, config) => {
    const keys = Object.keys(config);
    return `${toSentence(keys.map(format))} should print a warning`;
};

/*
 * v3.x deprecated options
 */

test(deprecation, {minifyFontWeight: false, fontFamily: false});
test(deprecation, {singleCharset: false});
