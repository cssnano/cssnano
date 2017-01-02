import test from 'ava';
import toSentence from 'array-to-sentence';
import cssnano from '..';

function format (key) {
    return `opts.${key}`;
}

function deprecation (t, config, css = 'h1{}') {
    return cssnano.process(css, config).then((result) => {
        t.truthy(result.messages.length);
    });
}

deprecation.title = (title, config) => {
    const keys = Object.keys(config);
    return `${toSentence(keys.map(format))} should emit a warning`;
};

/*
 * v3.x deprecated options
 */

test(deprecation, {minifyFontWeight: false, fontFamily: false});
test(deprecation, {fontFamily: false, minifyFontValues: {removeQuotes: true}});
test(deprecation, {singleCharset: false});
