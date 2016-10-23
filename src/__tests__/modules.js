import {join} from 'path';
import {readdirSync as directory} from 'fs';
import ava from 'ava';
import processCss from './_processCss';

const base = join(__dirname, '/modules');

directory(base).forEach(file => {
    const submodule = require(join(base, file));
    submodule.tests.forEach(({message, fixture, expected, options}) => {
        ava(message, processCss, fixture, expected, options);
    });
});
