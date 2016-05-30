import test from 'ava';
import postcss from 'postcss';
import plugin from '..';

const suites = [{
    message: 'should merge column values',
    fixture: 'h1{column-width:12em;column-count:auto}',
    expected: 'h1{columns:12em}'
}, {
    message: 'should minify column values',
    fixture: 'h1{column-width:auto;column-count:auto}',
    expected: 'h1{columns:auto}'
}, {
    message: 'should merge column-width with columns',
    fixture: 'h1{columns:12em auto;column-width:11em}',
    expected: 'h1{columns:11em}'
}, {
    message: 'should merge column width and column count',
    fixture: 'h1{column-width:6em;column-count:3}',
    expected: 'h1{columns:6em 3}'
}, {
    message: 'should pass through column width',
    fixture: 'h1{column-width:6em}',
    expected: 'h1{column-width:6em}'
}, {
    message: 'should pass through column count',
    fixture: 'h1{column-count:3}',
    expected: 'h1{column-count:3}'
}, {
    message: 'should pass through inherit',
    fixture: 'h1{column-width:inherit;column-count:inherit}',
    expected: 'h1{column-width:inherit;column-count:inherit}'
}];

suites.forEach(suite => {
    test(suite.message, t => {
        return postcss(plugin).process(suite.fixture).then(({css}) => {
            t.deepEqual(css, suite.expected);
        });
    });
});
