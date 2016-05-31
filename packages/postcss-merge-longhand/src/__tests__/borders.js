import test from 'ava';
import postcss from 'postcss';
import plugin from '..';
import {name} from '../../package.json';
import trbl from '../lib/trbl';

let suites = [];

const wsc = [{
    property: 'width',
    fixture: '1px'
}, {
    property: 'style',
    fixture: 'solid'
}, {
    property: 'color',
    fixture: 'red'
}];

wsc.forEach(({property, fixture}) => {
    suites.push({
        message: `should merge to form a border-trbl-${property} definition`,
        fixture: [
            `h1{`,
            `border-${trbl[0]}-${property}:${fixture};`,
            `border-${trbl[1]}-${property}:${fixture};`,
            `border-${trbl[2]}-${property}:${fixture};`,
            `border-${trbl[3]}-${property}:${fixture}`,
            `}`,
        ].join(''),
        expected: `h1{border-${property}:${fixture}}`
    });
});

trbl.forEach(direction => {
    const value = wsc.reduce((list, {fixture}) => [...list, fixture], []);
    suites.push({
        message: `should merge to form a border-${direction} definition`,
        fixture: [
            `h1{`,
            `border-${direction}-width:${value[0]};`,
            `border-${direction}-style:${value[1]};`,
            `border-${direction}-color:${value[2]}`,
            `}`,
        ].join(''),
        expected: `h1{border-${direction}:${value[0]} ${value[1]} ${value[2]}}`
    });
});

suites.push({
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
}, {
    message: 'should merge redundant values',
    fixture: 'h1{border-width:5px 5px 0;border-bottom-width:0}',
    expected: 'h1{border-width:5px 5px 0}'
}, {
    message: 'should merge redundant values (2)',
    fixture: 'h1{border-width:5px 5px 0;border-bottom-width:10px}',
    expected: 'h1{border-width:5px 5px 10px}'
}, {
    message: 'should merge redundant values (3)',
    fixture: 'h1{border:1px solid #ddd;border-bottom-color:transparent}',
    expected: 'h1{border:1px solid;border-color:#ddd #ddd transparent}'
}, {
    message: 'should merge redundant values (4)',
    fixture: 'h1{border:1px solid #ddd;border-bottom-style:dotted}',
    expected: 'h1{border:1px #ddd;border-style:solid solid dotted}'
}, {
    message: 'should merge redundant values (5)',
    fixture: 'h1{border:1px solid #ddd;border-bottom-width:5px}',
    expected: 'h1{border:solid #ddd;border-width:1px 1px 5px}'
}, {
    message: 'should produce the minimum css necessary',
    fixture: 'h1{border-width:0;border-top:1px solid #e1e1e1}',
    expected: 'h1{border-width:0;border-top:1px solid #e1e1e1}'
}, {
    message: 'should produce the minimum css necessary (2)',
    fixture: 'h1{border-color:rgba(0,0,0,.2);border-right-style:solid;border-right-width:1px}',
    expected: 'h1{border-right:1px solid;border-color:rgba(0,0,0,.2)}'
});

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
