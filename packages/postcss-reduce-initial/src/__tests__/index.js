import test from 'ava';
import postcss from 'postcss';
import values from '../../data/values.json';
import plugin from '..';

Object.keys(values).forEach(property => {
    test(`${property}: initial => ${property}: ${values[property]}`, t => {
        const out = postcss(plugin).process(`${property}:initial`);
        t.deepEqual(out.css, `${property}:${values[property]}`);
    });
});
