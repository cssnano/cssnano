import test from 'ava';
import postcss from 'postcss';
import plugin from '..';
import {name} from '../../package.json';

const suites = [{
    message: 'should merge identical border values',
    fixture: 'h1{border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;border-right:1px solid black}',
    expected: 'h1{border:1px solid black}'
}, {
    message: 'should merge identical border values with !important',
    fixture: 'h1{border-top:1px solid black!important;border-bottom:1px solid black!important;border-left:1px solid black!important;border-right:1px solid black!important}',
    expected: 'h1{border:1px solid black!important}'
}, {
    message: 'should not merge identical border values with mixed !important',
    fixture: 'h1{border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black!important;border-right:1px solid black!important}',
    expected: 'h1{border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black!important;border-right:1px solid black!important}',
}, {
    message: 'should merge border values',
    fixture: 'h1{border-color:red;border-width:1px;border-style:dashed}',
    expected: 'h1{border:1px dashed red}'
}, {
    message: 'should merge border values with !important',
    fixture: 'h1{border-color:red!important;border-width:1px!important;border-style:dashed!important}',
    expected: 'h1{border:1px dashed red!important}'
}, {
    message: 'should merge border values with identical values for all sides',
    fixture: 'h1{border-color:red red red red;border-width:1px 1px 1px 1px;border-style:solid solid solid solid}',
    expected: 'h1{border:1px solid red}'
}, {
    message: 'should merge border value shorthands',
    fixture: 'h1{border-color:red blue red blue;border-style:solid;border-width:10px 20px 10px 20px}',
    expected: 'h1{border-color:red blue;border-style:solid;border-width:10px 20px}'
}, {
    message: 'should not merge border values with mixed !important',
    fixture: 'h1{border-color:red;border-width:1px!important;border-style:dashed!important}',
    expected: 'h1{border-color:red;border-width:1px!important;border-style:dashed!important}'
}, {
    message: 'should not merge border values with more than 3 values',
    fixture: 'h1{border-color:red;border-style:dashed;border-width:1px 5px}',
    expected: 'h1{border-color:red;border-style:dashed;border-width:1px 5px}',
}, {
    message: 'should not merge rules with the inherit keyword',
    fixture: 'h1{border-width:3px;border-style:solid;border-color:inherit}',
    expected: 'h1{border:3px solid;border-color:inherit}',
}, {
    message: 'should not crash on comments',
    fixture: 'h1{\n  border-width:3px;/* 1 */\n  border-style:solid;/* 2 */\n  border-color:red;/* 3 */}',
    expected: 'h1{/* 1 *//* 2 */\n  border:3px solid red;/* 3 */}'
}, {
    message: 'should merge border-top-width',
    fixture: 'h1{border-top-width:5px;border-top-style:solid;border-top-color:red}',
    expected: 'h1{border-top:5px solid red}'
}, {
    message: 'should merge border-right-width',
    fixture: 'h1{border-right-width:5px;border-right-style:solid;border-right-color:red}',
    expected: 'h1{border-right:5px solid red}'
}, {
    message: 'should merge border-bottom-width',
    fixture: 'h1{border-bottom-width:5px;border-bottom-style:solid;border-bottom-color:red}',
    expected: 'h1{border-bottom:5px solid red}'
}, {
    message: 'should merge border-left-width',
    fixture: 'h1{border-left-width:5px;border-left-style:solid;border-left-color:red}',
    expected: 'h1{border-left:5px solid red}'
}, {
    message: 'should not convert border: 0 to border-width: 0',
    fixture: 'h1{border:0}',
    expected: 'h1{border:0}'
}, {
    message: 'should not merge border-left values with mixed !important',
    fixture: 'h1{border-left-color:red;border-left-width:1px!important;border-left-style:dashed!important}',
    expected: 'h1{border-left-color:red;border-left-width:1px!important;border-left-style:dashed!important}'
}, {
    message: 'should minimize default border values',
    fixture: 'h1{border:medium none currentColor}',
    expected: 'h1{border:medium}'
}, {
    message: 'should optimize border merging for length',
    fixture: 'h1{border:1px solid #ddd;border-bottom:1px solid #fff}',
    expected: 'h1{border:1px solid;border-color:#ddd #ddd #fff}'
}, {
    message: 'should not mangle borders',
    fixture: 'hr{display:block;height:1px;border:0;border-top:1px solid #ddd}',
    expected: 'hr{display:block;height:1px;border:0;border-top:1px solid #ddd}'
}, {
    message: 'should use shorter equivalent rules',
    fixture: 'h1{border:5px solid;border-color:#222 transparent transparent}',
    expected: 'h1{border:5px solid transparent;border-top:5px solid #222}'
}];

suites.forEach(suite => {
    test(suite.message, t => {
        return postcss(plugin).process(suite.fixture).then(({css}) => {
            t.deepEqual(css, suite.expected);
        });
    });
});

test('should use the postcss plugin api', t => {
    t.truthy(plugin().postcssVersion, 'should be able to access version');
    t.deepEqual(plugin().postcssPlugin, name, 'should be able to access name');
});
