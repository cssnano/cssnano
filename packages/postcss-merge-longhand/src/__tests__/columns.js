import test from 'ava';
import postcss from 'postcss';
import plugin from '..';

const suites = [{
    message: 'should merge column values',
    fixture: 'h1{column-width:12em;column-count:auto}',
    expected: 'h1{columns:12em auto}'
}, {
    message: 'should minify column values',
    fixture: 'h1{column-width:auto;column-count:auto}',
    expected: 'h1{columns:auto}'
}, {
    message: 'should merge column-width with columns',
    fixture: 'h1{columns:12em auto;column-width:11em}',
    expected: 'h1{columns:11em auto}'
}];

suites.forEach(suite => {
    test(suite.message, t => {
        return postcss(plugin).process(suite.fixture).then(({css}) => {
            t.deepEqual(css, suite.expected);
        });
    });
});
