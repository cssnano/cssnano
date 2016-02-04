import ava from 'ava';
import nano from '..';
import {readFileSync as file} from 'fs';
import {join} from 'path';
import postcss from 'postcss';
import specName from './util/specName';
import formatter from './util/formatter';
import frameworks from 'css-frameworks';

const base = join(__dirname, 'integrations');

Object.keys(frameworks).forEach(framework => {
    const testName = 'produceTheExpectedResultFor: ' + framework + '.css';
    ava(framework + '.css', t => {
        const plugins = [nano(), formatter()];
        return postcss(plugins).process(frameworks[framework]).then(result => {
            const expected = file(join(base, framework) + '.css', 'utf-8');
            t.same(result.css, expected, specName(testName));
        });
    });
});
