import test from 'ava';
import trbl from '../lib/trbl';
import processCss from './_processCss';

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
        processCss,
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
        processCss,
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
    processCss,
    'h1{border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black;border-right:1px solid black}',
    'h1{border:1px solid black}',
);

test(
    'should merge identical border values with !important',
    processCss,
    'h1{border-top:1px solid black!important;border-bottom:1px solid black!important;border-left:1px solid black!important;border-right:1px solid black!important}',
    'h1{border:1px solid black!important}'
);

test(
    'should not merge identical border values with mixed !important',
    processCss,
    'h1{border-top:1px solid black;border-bottom:1px solid black;border-left:1px solid black!important;border-right:1px solid black!important}'
);

test(
    'should merge border values',
    processCss,
    'h1{border-color:red;border-width:1px;border-style:dashed}',
    'h1{border:1px dashed red}'
);

test(
    'should merge border values with !important',
    processCss,
    'h1{border-color:red!important;border-width:1px!important;border-style:dashed!important}',
    'h1{border:1px dashed red!important}'
);

test(
    'should merge border values with identical values for all sides',
    processCss,
    'h1{border-color:red red red red;border-width:1px 1px 1px 1px;border-style:solid solid solid solid}',
    'h1{border:1px solid red}'
);

test(
    'should merge border value shorthands',
    processCss,
    'h1{border-color:red blue red blue;border-style:solid;border-width:10px 20px 10px 20px}',
    'h1{border-color:red blue;border-style:solid;border-width:10px 20px}'
);

test(
    'should not merge border values with mixed !important',
    processCss,
    'h1{border-color:red;border-width:1px!important;border-style:dashed!important}'
);

test(
    'should not merge border values with more than 3 values',
    processCss,
    'h1{border-color:red;border-style:dashed;border-width:1px 5px}'
);

test(
    'should not merge rules with the inherit keyword',
    processCss,
    'h1{border-width:3px;border-style:solid;border-color:inherit}',
    'h1{border:3px solid;border-color:inherit}'
);

test(
    'should not crash on comments',
    processCss,
    'h1{\n  border-width:3px;/* 1 */\n  border-style:solid;/* 2 */\n  border-color:red;/* 3 */}',
    'h1{/* 1 *//* 2 */\n  border:3px solid red;/* 3 */}'
);

test(
    'should not convert border: 0 to border-width: 0',
    processCss,
    'h1{border:0}'
);

test(
    'should not merge border-left values with mixed !important',
    processCss,
    'h1{border-left-color:red;border-left-width:1px!important;border-left-style:dashed!important}'
);

test(
    'should minimize default border values',
    processCss,
    'h1{border:medium none currentColor}',
    'h1{border:medium}'
);

test(
    'should optimize border merging for length',
    processCss,
    'h1{border:1px solid #ddd;border-bottom:1px solid #fff}',
    'h1{border:1px solid;border-color:#ddd #ddd #fff}'
);

test(
    'should not mangle borders',
    processCss,
    'hr{display:block;height:1px;border:0;border-top:1px solid #ddd}'
);

test(
    'should use shorter equivalent rules',
    processCss,
    'h1{border:5px solid;border-color:#222 transparent transparent}',
    'h1{border:5px solid transparent;border-top:5px solid #222}'
);

test(
    'should merge redundant values',
    processCss,
    'h1{border-width:5px 5px 0;border-bottom-width:0}',
    'h1{border-width:5px 5px 0}'
);

test(
    'should merge redundant values (2)',
    processCss,
    'h1{border-width:5px 5px 0;border-bottom-width:10px}',
    'h1{border-width:5px 5px 10px}'
);

test(
    'should merge redundant values (3)',
    processCss,
    'h1{border:1px solid #ddd;border-bottom-color:transparent}',
    'h1{border:1px solid;border-color:#ddd #ddd transparent}'
);

test(
    'should merge redundant values (4)',
    processCss,
    'h1{border:1px solid #ddd;border-bottom-style:dotted}',
    'h1{border:1px #ddd;border-style:solid solid dotted}'
);

test(
    'should merge redundant values (5)',
    processCss,
    'h1{border:1px solid #ddd;border-bottom-width:5px}',
    'h1{border:solid #ddd;border-width:1px 1px 5px}'
);

test(
    'should produce the minimum css necessary',
    processCss,
    'h1{border-width:0;border-top:1px solid #e1e1e1}'
);

test(
    'should produce the minimum css necessary (2)',
    processCss,
    'h1{border-color:rgba(0,0,0,.2);border-right-style:solid;border-right-width:1px}',
    'h1{border-right:1px solid;border-color:rgba(0,0,0,.2)}'
);

test(
    'should produce the minimum css necessary (3)',
    processCss,
    'h1{border-top:0 solid transparent;border-right:4em solid transparent;border-bottom:4em solid transparent;border-left:0 solid transparent;border-right-color:inherit}',
    'h1{border-color:transparent;border-style:solid;border-width:0 4em 4em 0;border-right-color:inherit}'
);

test(
    'should not merge declarations with hacks',
    processCss,
    'h1{border-color:red red red red;_border-width:1px 1px 1px 1px;border-style:solid solid solid solid}'
);
