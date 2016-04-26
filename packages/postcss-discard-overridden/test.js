import fs from 'fs';
import postcss from 'postcss';
import test from 'ava';

import plugin from './';

function run(t, input, output) {
    return postcss([ plugin() ]).process(input)
        .then( result => {
            t.deepEqual(result.css, output);
            t.deepEqual(result.warnings().length, 0);
        });
}

let input = fs.readFileSync('./test/input.css', { encoding: 'utf-8' });
let output = fs.readFileSync('./test/output.css', { encoding: 'utf-8' });

test('Overridden @keyframes should be discarded.', t => {
    return run(t, input, output);
});


