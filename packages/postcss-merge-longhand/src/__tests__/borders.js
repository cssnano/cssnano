import test from 'ava';
import trbl from '../lib/trbl';
import plugin from '..';
import {processCSSFactory} from '../../../../util/testHelpers';

const {passthroughCSS, processCSS} = processCSSFactory(plugin);

const wsc = [{
    property: 'width',
    fixture: '1px',
}, {
    property: 'style',
    fixture: 'solid',
}, {
    property: 'color',
    fixture: 'red',
}];

wsc.forEach(({property, fixture}) => {
    test(
        `should merge to form a border-trbl-${property} definition`,
        processCSS,
        [
            `h1{`,
            `border-${trbl[0]}-${property}:${fixture};`,
            `border-${trbl[1]}-${property}:${fixture};`,
            `border-${trbl[2]}-${property}:${fixture};`,
            `border-${trbl[3]}-${property}:${fixture}`,
            `}`,
        ].join(''),
        `h1{border-${property}:${fixture}}`
    );
});

trbl.forEach(direction => {
    const value = wsc.reduce((list, {fixture}) => [...list, fixture], []);
    test(
        `should merge to form a border-${direction} definition`,
        processCSS,
        [
            `h1{`,
            `border-${direction}-width:${value[0]};`,
            `border-${direction}-style:${value[1]};`,
            `border-${direction}-color:${value[2]}`,
            `}`,
        ].join(''),
        `h1{border-${direction}:${value[0]} ${value[1]} ${value[2]}}`
    );
});

test(
    'should merge identical border values',
    processCSS,
    'h1{border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;border-right:1px solid black}',
    'h1{border:1px solid black}',
);

test(
    'should merge identical border values with !important',
    processCSS,
    'h1{border-top:1px solid black!important;border-bottom:1px solid black!important;border-left:1px solid black!important;border-right:1px solid black!important}',
    'h1{border:1px solid black!important}'
);

test(
    'should not merge identical border values with mixed !important',
    passthroughCSS,
    'h1{border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black!important;border-right:1px solid black!important}'
);

test(
    'should merge border values',
    processCSS,
    'h1{border-color:red;border-width:1px;border-style:dashed}',
    'h1{border:1px dashed red}'
);

test(
    'should merge border values with !important',
    processCSS,
    'h1{border-color:red!important;border-width:1px!important;border-style:dashed!important}',
    'h1{border:1px dashed red!important}'
);

test(
    'should merge border values with identical values for all sides',
    processCSS,
    'h1{border-color:red red red red;border-width:1px 1px 1px 1px;border-style:solid solid solid solid}',
    'h1{border:1px solid red}'
);

test(
    'should merge border value shorthands',
    processCSS,
    'h1{border-color:red blue red blue;border-style:solid;border-width:10px 20px 10px 20px}',
    'h1{border-color:red blue;border-style:solid;border-width:10px 20px}'
);

test(
    'should not merge border values with mixed !important',
    passthroughCSS,
    'h1{border-color:red;border-width:1px!important;border-style:dashed!important}'
);

test(
    'should not merge border values with more than 3 values',
    passthroughCSS,
    'h1{border-color:red;border-style:dashed;border-width:1px 5px}'
);

test(
    'should not merge rules with the inherit keyword',
    processCSS,
    'h1{border-width:3px;border-style:solid;border-color:inherit}',
    'h1{border:3px solid;border-color:inherit}'
);

test(
    'should not crash on comments',
    processCSS,
    'h1{\n  border-width:3px;/* 1 */\n  border-style:solid;/* 2 */\n  border-color:red;/* 3 */}',
    'h1{/* 1 *//* 2 */\n  border:3px solid red;/* 3 */}'
);

test(
    'should not convert border: 0 to border-width: 0',
    passthroughCSS,
    'h1{border:0}'
);

test(
    'should not merge border-left values with mixed !important',
    passthroughCSS,
    'h1{border-left-color:red;border-left-width:1px!important;border-left-style:dashed!important}'
);

test(
    'should minimize default border values',
    processCSS,
    'h1{border:medium none currentColor}',
    'h1{border:medium}'
);

test(
    'should optimize border merging for length',
    processCSS,
    'h1{border:1px solid #ddd;border-bottom:1px solid #fff}',
    'h1{border:1px solid;border-color:#ddd #ddd #fff}'
);

test(
    'should not mangle borders',
    passthroughCSS,
    'hr{display:block;height:1px;border:0;border-top:1px solid #ddd}'
);

test(
    'should use shorter equivalent rules',
    processCSS,
    'h1{border:5px solid;border-color:#222 transparent transparent}',
    'h1{border:5px solid transparent;border-top:5px solid #222}'
);

test(
    'should merge redundant values',
    processCSS,
    'h1{border-width:5px 5px 0;border-bottom-width:0}',
    'h1{border-width:5px 5px 0}'
);

test(
    'should merge redundant values (2)',
    processCSS,
    'h1{border-width:5px 5px 0;border-bottom-width:10px}',
    'h1{border-width:5px 5px 10px}'
);

test(
    'should merge redundant values (3)',
    processCSS,
    'h1{border:1px solid #ddd;border-bottom-color:transparent}',
    'h1{border:1px solid;border-color:#ddd #ddd transparent}'
);

test(
    'should merge redundant values (4)',
    processCSS,
    'h1{border:1px solid #ddd;border-bottom-style:dotted}',
    'h1{border:1px #ddd;border-style:solid solid dotted}'
);

test(
    'should merge redundant values (5)',
    processCSS,
    'h1{border:1px solid #ddd;border-bottom-width:5px}',
    'h1{border:solid #ddd;border-width:1px 1px 5px}'
);

test(
    'should merge redundant values (6)',
    processCSS,
    'h1{border-width:1px;border-top-width:0;border-left-width:0;border-style:solid;border-color:#000;}',
    'h1{border-color:#000;border-style:solid;border-width:0 1px 1px 0;}',
);

test(
    'should merge redundant border-spacing values',
    processCSS,
    'h1{border-spacing:10px 10px;}',
    'h1{border-spacing:10px;}'
);

test(
    'should not merge different border-spacing values',
    passthroughCSS,
    'h1{border-spacing:10px 50px;}'
);

test(
    'should merge border and border-width values',
    processCSS,
    'h1{border:0 solid rgba(0, 0, 0, 0.2);border-width:1px;}',
    'h1{border:1px solid rgba(0, 0, 0, 0.2);}'
);

test(
    'should merge border and multiple border-*-width values',
    processCSS,
    'h1{border:0 solid rgba(0, 0, 0, 0.2);border-top-width:1px;border-right-width:1px;border-bottom-width:1px;border-left-width:1px;}',
    'h1{border:1px solid rgba(0, 0, 0, 0.2);}'
);

test(
    'should produce the minimum css necessary',
    passthroughCSS,
    'h1{border-width:0;border-top:1px solid #e1e1e1}'
);

test(
    'should produce the minimum css necessary (2)',
    processCSS,
    'h1{border-color:rgba(0,0,0,.2);border-right-style:solid;border-right-width:1px}',
    'h1{border-right:1px solid;border-color:rgba(0,0,0,.2)}'
);

test(
    'should produce the minimum css necessary (3)',
    processCSS,
    'h1{border-top:0 solid transparent;border-right:4em solid transparent;border-bottom:4em solid transparent;border-left:0 solid transparent;border-right-color:inherit}',
    'h1{border-color:transparent;border-style:solid;border-width:0 4em 4em 0;border-right-color:inherit}'
);

test(
    'should produce the minimum css necessary (4)',
    processCSS,
    'h1{border:none;border-top:1px solid #d4d4d5;border-right:1px solid #d4d4d5}',
    'h1{border:1px solid #d4d4d5;border-bottom:none;border-left:none}'
);

test(
    'should produce the minimum css necessary (5)',
    processCSS,
    'h1{border-spacing:50px 50px;border-top:0 solid transparent;border-right:4em solid transparent;border-bottom:4em solid transparent;border-left:0 solid transparent;border-right-color:inherit}',
    'h1{border-spacing:50px;border-color:transparent;border-style:solid;border-width:0 4em 4em 0;border-right-color:inherit}'
);

test(
    'should not merge declarations with hacks',
    processCSS,
    'h1{border-color:red red red red;_border-width:1px 1px 1px 1px;border-style:solid solid solid solid}',
    'h1{border-color:red;_border-width:1px 1px 1px 1px;border-style:solid}'
);

test(
    'should not merge fallback colours',
    passthroughCSS,
    'h1{border-color:#ddd;border-color:rgba(0,0,0,.15)}'
);

test(
    'should not merge fallback colours with shorthand property',
    processCSS,
    'h1{border:1px solid #ccc;border:1px solid rgba(0,0,0,.2)}',
    'h1{border:1px solid #ccc;border:1px solid rgba(0,0,0,.2)}'
);

test(
    'should merge together all initial values',
    processCSS,
    'h1{border-color:initial;border-width:initial;border-style:initial}',
    'h1{border:initial}'
);

test(
    'should merge together all inherit values',
    processCSS,
    'h1{border-color:inherit;border-width:inherit;border-style:inherit}',
    'h1{border:inherit}'
);

test(
    'should preserve nesting level',
    processCSS,
    'section{h1{border-color:red;border-width:1px;border-style:solid}}',
    'section{h1{border:1px solid red}}'
);

test(
    'should not merge custom properties',
    passthroughCSS,
    ':root{--my-border-width:2px;--my-border-style:solid;--my-border-color:#fff;}'
);

test(
    'should not merge custom properties with variables',
    passthroughCSS,
    ':root{--my-border-width:var(--my-border-width);--my-border-style:var(--my-border-style);--my-border-color:var(--my-border-color);}'
);


test(
    'should overwrite some border-width props and save fallbacks',
    processCSS,
    'h1{border-top-width:10px;border-right-width:var(--variable);border-right-width:15px;border-bottom-width:var(--variable);border-bottom-width:20px;border-left-width:25px;border-top-width:var(--variable);border-left-width:var(--variable)}',
    'h1{border-width:10px 15px 20px 25px;border-top-width:var(--variable);border-left-width:var(--variable)}'
);

test(
    'save fallbacks should border-style',
    processCSS,
    'h1{border-style:dotted;border-style:var(--variable)}',
    'h1{border-style:dotted;border-style:var(--variable)}'
);

test(
    'save fallbacks should border-color',
    processCSS,
    'h1{border-color:dotted;border-color:var(--variable)}',
    'h1{border-color:dotted;border-color:var(--variable)}'
);

test(
    'should not explode border with custom properties',
    passthroughCSS,
    'h1{border:var(--variable)}',
);

trbl.forEach(direction => {
    test(
        `should not explode border-${direction} with custom properties`,
        passthroughCSS,
        `h1{border-${direction}:var(--variable)}`,
    );
});
