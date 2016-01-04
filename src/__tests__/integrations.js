import ava from 'ava';
import nano from '..';
import {readFileSync as file} from 'fs';
import {join} from 'path';
import postcss from 'postcss';
import specName from './util/specName';
import formatter from './util/formatter';
import frameworks from 'css-frameworks';

const base = join(__dirname, 'integrations');

function formatted (css) {
    return postcss().use(nano()).use(formatter).process(css);
}

Object.keys(frameworks).forEach(framework => {
    const testName = 'produceTheExpectedResultFor: ' + framework + '.css';
    ava(framework + '.css', t => {
        formatted(frameworks[framework]).then(result => {
            var expected = file(join(base, framework) + '.css', 'utf-8');
            t.same(result.css, expected, specName(testName));
        }, err => {
            t.notOk(err.stack);
        });
    });
});
