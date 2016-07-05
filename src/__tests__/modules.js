import {join} from 'path';
import {readdirSync as directory} from 'fs';
import ava from 'ava';
import nano from '..';

const base = join(__dirname, '/modules');

directory(base).forEach(file => {
    const submodule = require(join(base, file));
    submodule.tests.forEach(test => {
        ava(test.message, t => {
            const options = test.options || {};
            return nano.process(test.fixture, options).then(result => {
                t.deepEqual(result.css, test.expected);
            });
        });
    });
});
