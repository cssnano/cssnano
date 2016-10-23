import {readdirSync as directory, readFileSync as file} from 'fs';
import {join} from 'path';
import ava from 'ava';
import processCss from './_processCss';
import specName from './util/specName';

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
    const {fixture, expected} = specs[name];
    ava(specName(name), processCss, fixture, expected);
});
