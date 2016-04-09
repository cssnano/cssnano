import ava from 'ava';
import nano from '..';
import {readdirSync as directory, readFileSync as file} from 'fs';
import specName from './util/specName';
import {join} from 'path';

const base = join(__dirname, 'fixtures');

const specs = directory(base).reduce((tests, cssFile) => {
    const parts = cssFile.split('.');
    if (!tests[parts[0]]) {
        tests[parts[0]] = {};
    }
    tests[parts[0]][parts[1]] = file(join(base, cssFile), 'utf-8');
    return tests;
}, {});

Object.keys(specs).forEach(name => {
    const spec = specs[name];
    ava(name, t => {
        return nano.process(spec.fixture).then(result => {
            t.deepEqual(result.css, spec.expected, specName(name));
        });
    });
});
