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
    'h1{border:none}'
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
    'h1{border:none}'
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
    'hr{display:block;height:1px;border:none;border-top:1px solid #ddd}'
);

test(
    'Should not mangle borders (#579) (1)',
    processCSS,
    'h1{border-bottom:none;border-color:red}',
    'h1{border-bottom:none;border-color:red}',
);

test(
    'Should not mangle borders (#579) (2)',
    processCSS,
    'h1{border:none;border-color:red}',
    'h1{border:red}',
);

test(
    'should use shorter equivalent rules',
    processCSS,
    'h1{border:5px solid;border-color:#222 transparent transparent}',
    'h1{border:5px solid transparent;border-top-color:#222}',
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
    'h1{border-width:1px;border-top-width:none;border-left-width:none;border-style:solid;border-color:#000;}',
    'h1{border-color:#000;border-style:solid;border-width:0 1px 1px 0;}',
);

test(
    'Should not merge redundant values if declarations are of different importance (#618)',
    passthroughCSS,
    'h1{border:1px solid #3060b1;border-bottom:1px solid #3060b1 !important}',
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
    'h1{border-width:none;border-top:1px solid #e1e1e1}'
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
    'should produce the minimum css necessary (6)',
    processCSS,
    'h1{border:1px solid #00d1b2;border-right:none;border-top:none}',
    'h1{border:1px solid #00d1b2;border-top:none;border-right:none}',
);

test(
    'should produce the minimum css necessary (7)',
    processCSS,
    'h1{border-top:none;border-right:none;border-bottom:1px solid #cacaca;border-left:none}',
    'h1{border:none;border-bottom:1px solid #cacaca}',
);

test(
    'should produce the minimum css necessary (8)',
    processCSS,
    'h1{border-top:none;border-right:none;border-bottom:none;border-left:5px}',
    'h1{border:none;border-left:5px}',
);

test(
    'should produce the minimum css necessary (9)',
    processCSS,
    'h1{border:medium none;border-style:solid;border-color:rgba(34, 36, 38, 0.15);border-width:0px 1px 1px 0px}',
    'h1{border:solid rgba(34, 36, 38, 0.15);border-width:0px 1px 1px 0px}'
);

test(
    'should produce the minimum css necessary (10)',
    processCSS,
    'h1{border-bottom:none;border-left:1px solid transparent;border-right:1px solid transparent;border-top:2px solid transparent}',
    'h1{border:1px solid transparent;border-top:2px solid transparent;border-bottom:none}',
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

test(
    'should not explode border with initial properties',
    passthroughCSS,
    'h1{border:initial}',
);

test(
    'should not explode border with inherit properties',
    passthroughCSS,
    'h1{border:inherit}',
);

test(
    'should not explode border with unset properties',
    passthroughCSS,
    'h1{border:unset}',
);

trbl.forEach(direction => {
    test(
        `should not explode border-${direction} with custom properties`,
        passthroughCSS,
        `h1{border-${direction}:var(--variable)}`,
    );
});

test(
    'should not explode custom properties with less than two concrete sides (1)',
    passthroughCSS,
    'h1{border:var(--border-width) var(--border-style) transparent}',
);

test(
    'should not explode custom properties with less than two concrete sides (2)',
    passthroughCSS,
    'h1{border:var(--border-width) solid var(--border-color)}',
);

test(
    'should not explode custom properties with less than two concrete sides (3)',
    passthroughCSS,
    'h1{border:1px var(--border-style) var(--border-color)}',
);

test(
    'Should correctly merge border declarations (#551) (1)',
    processCSS,
    'h1{border:1px solid black;border-top-width:2px;border-right-width:2px;border-bottom-width:2px}',
    'h1{border:2px solid black;border-left-width:1px}',
);

test(
    'Should correctly merge border declarations (#551) (2)',
    processCSS,
    'h1{border:none;border-top:6px solid #000;border-bottom:1px solid #fff}',
    'h1{border:none;border-top:6px solid #000;border-bottom:1px solid #fff}',
);

test(
    'should not break border-color (#553)',
    processCSS,
    'h1{border:solid transparent;border-width:0 8px 16px;border-bottom-color:#eee}',
    'h1{border:solid transparent;border-bottom:solid #eee;border-width:0 8px 16px}'
);

test(
    'should not remove border-top-color (#554)',
    passthroughCSS,
    'h1{border-top-color: rgba(85, 85, 85, 0.95);border-bottom: 0}',
);

test(
    'Should not merge if there is a shorthand property between them (#557) (1)',
    passthroughCSS,
    'h1{border:1px solid #d3d6db;border:1px solid var(--gray-lighter);border-left-width:0;}',
);

test(
    'Should not merge if there is a shorthand property between them (#557) (2)',
    processCSS,
    'h1{border-left-style:solid;border-left-color:#d3d6db;border:1px solid var(--gray-lighter);border-left-width:0;}',
    'h1{border-left:1px solid #d3d6db;border:1px solid var(--gray-lighter);border-left-width:0;}',
);

test(
    'Should not convert currentcolor (#559) (2)',
    passthroughCSS,
    'h1{border:2px solid transparent;border-top-color:currentcolor;}',
);

test(
    'Should not convert currentcolor (#559) (2)',
    processCSS,
    'h1{border:2px solid transparent;border-top-color:currentColor;}',
    'h1{border:2px solid transparent;border-top-color:currentcolor;}',
);

test(
    'should not drop border-width with custom property from border shorthand (#561)',
    passthroughCSS,
    'h1{border:var(--border-width) solid grey}',
);

test(
    'Should not throw error (#570)',
    processCSS,
    'h1{border:1px none;border-bottom-style:solid}',
    'h1{border:1px;border-bottom:1px solid}',
);

test(
    'Should correctly merge borders with custom properties (#572)',
    passthroughCSS,
    'h1{border:6px solid red;border-top:6px solid var(--mycolor);}',
);

test(
    'Should correctly merge borders with custom properties (#619) (1)',
    passthroughCSS,
    'h1{border:1px solid;border-color:var(--color-var)}',
);

test(
    'Should correctly merge borders with custom properties (#619) (2)',
    passthroughCSS,
    'h1{border-left:1px solid;border-left-color:var(--color-var)}',
);

test(
    'Should correctly merge borders with custom properties (#619) (3)',
    passthroughCSS,
    'h1{border-color:red green blue magenta;border-top-color:var(--color-var)}',
);


test(
    'Should correctly merge borders with custom properties (#652)',
    processCSS,
    'h1{border-width:var(--a);border-style:var(--b);border-color:var(--c)}',
    'h1{border:var(--a) var(--b) var(--c)}'
);

test(
    'Should not throw error when a border property value is undefined (#639)',
    processCSS,
    'h1{border:2px solid #fff;border-color:inherit}',
    'h1{border:2px solid;border-color:inherit}',
);
