import ava from 'ava';
import postcss from 'postcss';
import plugin from '..';
import {name} from '../../package.json';

const tests = [{
    message: 'should order border consistently',
    fixture: 'h1{border:1px solid red;border:1px red solid;border:solid 1px red;border:solid red 1px;border:red solid 1px;border:red 1px solid}',
    expected: 'h1{border:1px solid red;border:1px solid red;border:1px solid red;border:1px solid red;border:1px solid red;border:1px solid red}'
}, {
    message: 'should order border with two properties',
    fixture: 'h1{border:solid 1px}',
    expected: 'h1{border:1px solid}'
}, {
    message: 'should order border with color functions',
    fixture: 'h1{border:rgba(255,255,255,0.5) dashed thick}',
    expected: 'h1{border:thick dashed rgba(255,255,255,0.5)}',
}, {
    message: 'should order border longhand',
    fixture: 'h1{border-left:solid 2px red;border-right:#fff 3px dashed;border-top:dotted #000 1px;border-bottom:4px navy groove}',
    expected: 'h1{border-left:2px solid red;border-right:3px dashed #fff;border-top:1px dotted #000;border-bottom:4px groove navy}',
}, {
    message: 'should order width currentColor',
    fixture: 'h1{border:solid 2vmin currentColor}',
    expected: 'h1{border:2vmin solid currentColor}'
}, {
    message: 'should skip border:inherit',
    fixture: 'h1{border:inherit}',
    expected: 'h1{border:inherit}'
}, {
    message: 'should skip border:initial',
    fixture: 'h1{border:initial}',
    expected: 'h1{border:initial}'
}, {
    message: 'should skip border:unset',
    fixture: 'h1{border:unset}',
    expected: 'h1{border:unset}'
}, {
    message: 'should order outline consistently',
    fixture: 'h1{outline:solid red .6em}',
    expected: 'h1{outline:.6em solid red}'
}, {
    message: 'should order outline(outline-color is invert)',
    fixture: 'h1{outline:solid invert 1px}',
    expected: 'h1{outline:1px solid invert}'
}, {
    message: 'should handle -webkit-focus-ring & auto',
    fixture: 'h1{outline:-webkit-focus-ring-color 5px auto}',
    expected: 'h1{outline:5px auto -webkit-focus-ring-color}'
}, {
    message: 'should order flex-flow',
    fixture: 'h1{flex-flow: wrap column}',
    expected: 'h1{flex-flow: column wrap}'
}, {
    message: 'should order flex-flow',
    fixture: 'h1{flex-flow: row-reverse wrap-reverse}',
    expected: 'h1{flex-flow: row-reverse wrap-reverse}'
}, {
    message: 'should skip flex-flow:inherit',
    fixture: 'h1{flex-flow:inherit}',
    expected: 'h1{flex-flow:inherit}'
}, {
    message: 'should skip flex-flow:unset',
    fixture: 'h1{flex-flow: unset}',
    expected: 'h1{flex-flow: unset}'
}, {
    message: 'should skip flex: 1 0 auto',
    fixture: 'h1{flex: 1 0 auto;}',
    expected: 'h1{flex: 1 0 auto;}'
}, {
    message: 'should skip flex: 0 1 auto',
    fixture: 'h1{flex: 0 1 auto;}',
    expected: 'h1{flex: 0 1 auto;}'
}, {
    message: 'should support calc width in borders',
    fixture: 'h1 {border: solid red calc(20px - 10px);}',
    expected: 'h1 {border: calc(20px - 10px) solid red;}'
}, {
    message: 'should order box-shadow consistently (1)',
    fixture: 'h1{box-shadow:2px 5px red}',
    expected: 'h1{box-shadow:2px 5px red}'
}, {
    message: 'should order box-shadow consistently (2)',
    fixture: 'h1{box-shadow:red 2px 5px}',
    expected: 'h1{box-shadow:2px 5px red}'
}, {
    message: 'should order box-shadow consistently (3)',
    fixture: 'h1{box-shadow:2px 5px 10px red}',
    expected: 'h1{box-shadow:2px 5px 10px red}'
}, {
    message: 'should order box-shadow consistently (4)',
    fixture: 'h1{box-shadow:red 2px 5px 10px}',
    expected: 'h1{box-shadow:2px 5px 10px red}'
}, {
    message: 'should order box-shadow consistently (5)',
    fixture: 'h1{box-shadow:inset red 2px 5px 10px}',
    expected: 'h1{box-shadow:inset 2px 5px 10px red}'
}, {
    message: 'should order box-shadow consistently (6)',
    fixture: 'h1{box-shadow:red 2px 5px 10px inset}',
    expected: 'h1{box-shadow:inset 2px 5px 10px red}'
}, {
    message: 'should order box-shadow consistently (7)',
    fixture: 'h1{box-shadow:2px 5px 10px red inset}',
    expected: 'h1{box-shadow:inset 2px 5px 10px red}'
}, {
    message: 'should order box-shadow consistently (8)',
    fixture: 'h1{box-shadow:red 2px 5px,blue 2px 5px}',
    expected: 'h1{box-shadow:2px 5px red,2px 5px blue}'
}, {
    message: 'should order box-shadow consistently (9)',
    fixture: 'h1{box-shadow:red 2px 5px 10px inset,blue inset 2px 5px 10px}',
    expected: 'h1{box-shadow:inset 2px 5px 10px red,inset 2px 5px 10px blue}'
}, {
    message: 'should order box-shadow consistently (10)',
    fixture: 'h1{box-shadow:red 2px 5px 10px inset,blue 2px 5px 10px inset}',
    expected: 'h1{box-shadow:inset 2px 5px 10px red,inset 2px 5px 10px blue}'
}, {
    message: 'should order box-shadow consistently (11)',
    fixture: 'h1{box-shadow:rgba(255, 0, 0, 0.5) 2px 5px 10px inset}',
    expected: 'h1{box-shadow:inset 2px 5px 10px rgba(255, 0, 0, 0.5)}'
}, {
    message: 'should order box-shadow consistently (12)',
    fixture: 'h1{box-shadow:0 0 3px}',
    expected: 'h1{box-shadow:0 0 3px}'
}, {
    message: 'should pass through invalid box-shadow values',
    fixture: 'h1{box-shadow:1px solid rgba(34,36,38,.15)}',
    expected: 'h1{box-shadow:1px solid rgba(34,36,38,.15)}'
}, {
    message: 'should pass through important comments (border)',
    fixture: 'border: 1px /*!wow*/ red solid',
    expected: 'border: 1px /*!wow*/ red solid'
}, {
    message: 'should pass through important comments (box-shadow)',
    fixture: 'box-shadow: 0 1px 3px /*!wow*/ red',
    expected: 'box-shadow: 0 1px 3px /*!wow*/ red'
}, {
    message: 'should pass through important comments (flex-flow)',
    fixture: 'flex-flow: row-reverse /*!wow*/ wrap-reverse',
    expected: 'flex-flow: row-reverse /*!wow*/ wrap-reverse'
}, {
    message: 'should pass through important comments (transition)',
    fixture: 'transition: ease-out width /*!wow*/ .5s 2s',
    expected: 'transition: ease-out width /*!wow*/ .5s 2s' 
}, {
    message: 'should order transition consistently (1)',
    fixture: 'transition: width .5s ease-out 2s',
    expected: 'transition: width .5s ease-out 2s'
}, {
    message: 'should order transition consistently (2)',
    fixture: 'transition: ease-out width .5s 2s',
    expected: 'transition: width .5s ease-out 2s'
}, {
    message: 'should order transition consistently (3)',
    fixture: 'transition: ease-out .5s width 2s',
    expected: 'transition: width .5s ease-out 2s'
}, {
    message: 'should order transition consistently (4)',
    fixture: 'transition: .5s 2s width ease-out',
    expected: 'transition: width .5s ease-out 2s'
}, {
    message: 'should order transition consistently (5)',
    fixture: 'transition: .5s 2s width steps(5, start)',
    expected: 'transition: width .5s steps(5, start) 2s'
}, {
    message: 'should order transition consistently (6)',
    fixture: 'transition: .5s 2s width cubic-bezier(0, 0.3, 0.6, 1)',
    expected: 'transition: width .5s cubic-bezier(0, 0.3, 0.6, 1) 2s'
}, {
    message: 'should order transition consistently (7)',
    fixture: 'transition: .5s 2s width ease-out,.8s 1s height ease',
    expected: 'transition: width .5s ease-out 2s,height .8s ease 1s'
}];

tests.forEach(test => {
    ava(test.message, t => {
        const out = postcss(plugin(test.options || {})).process(test.fixture);
        t.same(out.css, test.expected);
    });
});

ava('should use the postcss plugin api', t => {
    t.ok(plugin().postcssVersion, 'should be able to access version');
    t.same(plugin().postcssPlugin, name, 'should be able to access name');
});
