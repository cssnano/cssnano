import fs from 'fs';
import {join} from 'path';
import test from 'ava';
import postcss from 'postcss';
import frameworks from '../../../../util/frameworks';
import formatter from './util/formatter';
import nano from '..';

const output = join(__dirname, 'integrations');

Object.keys(frameworks).forEach(framework => {
    test(`${framework}.css`, t => {
        const plugins = [nano(), formatter()];
        return postcss(plugins).process(frameworks[framework]).then(({css}) => {
            const expected = fs.readFileSync(join(output, framework) + '.css', 'utf-8');
            t.deepEqual(css, expected);
        });
    });
});
