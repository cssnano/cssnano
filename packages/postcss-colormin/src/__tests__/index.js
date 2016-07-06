import test from 'ava';
import postcss from 'postcss';
import plugin from '..';
import {name} from '../../package.json';

const tests = [{
    message: 'should minify color values',
    fixture: 'h1{color:yellow}',
    expected: 'h1{color:#ff0}',
}, {
    message: 'should minify color values (2)',
    fixture: 'h1{box-shadow:0 1px 3px rgba(255, 230, 220, 0.5)}',
    expected: 'h1{box-shadow:0 1px 3px rgba(255,230,220,.5)}',
}, {
    message: 'should minify color values (3)',
    fixture: 'h1{background:hsla(134, 50%, 50%, 1)}',
    expected: 'h1{background:#40bf5e}',
}, {
    message: 'should minify color values (4)',
    fixture: 'h1{text-shadow:1px 1px 2px #000000}',
    expected: 'h1{text-shadow:1px 1px 2px #000}',
}, {
    message: 'should minify color values (5)',
    fixture: 'h1{text-shadow:1px 1px 2px rgb(255, 255, 255)}',
    expected: 'h1{text-shadow:1px 1px 2px #fff}',
}, {
    message: 'should minify color values (5)',
    fixture: 'h1{text-shadow:1px 1px 2px hsl(0,0%,100%)}',
    expected: 'h1{text-shadow:1px 1px 2px #fff}',
}, {
    message: 'should minify color values in background gradients',
    fixture: 'h1{background:linear-gradient( #ff0000,yellow )}',
    expected: 'h1{background:linear-gradient( red,#ff0 )}',
}, {
    message: 'should minify color values in background gradients (2)',
    fixture: 'h1{background:linear-gradient(yellow, orange), linear-gradient(black, rgba(255, 255, 255, 0))}',
    expected: 'h1{background:linear-gradient(#ff0, orange), linear-gradient(#000, hsla(0,0%,100%,0))}',
}, {
    message: 'should minify color values in background gradients (3)',
    fixture: 'h1{background:linear-gradient(0deg, yellow, black 40%, red)}',
    expected: 'h1{background:linear-gradient(0deg, #ff0, #000 40%, red)}',
}, {
    message: 'should not minify in font properties',
    fixture: 'h1{font-family:black}',
    expected: 'h1{font-family:black}',
}, {
    message: 'should correctly parse multiple box shadow values',
    fixture: 'h1{box-shadow:inset 0 1px 1px rgba(0, 0, 0, .075),0 0 8px rgba(102, 175, 233, .6)}',
    expected: 'h1{box-shadow:inset 0 1px 1px rgba(0,0,0,.075),0 0 8px rgba(102,175,233,.6)}',
}, {
    message: 'should make an exception for webkit tap highlight color (issue 1)',
    fixture: 'h1{-webkit-tap-highlight-color:rgba(0,0,0,0)}',
    expected: 'h1{-webkit-tap-highlight-color:rgba(0,0,0,0)}',
}, {
    message: 'should still minify spaces in webkit tap highlight color',
    fixture: 'h1{-webkit-tap-highlight-color:rgba( 0, 0, 0, 0)}',
    expected: 'h1{-webkit-tap-highlight-color:rgba(0,0,0,0)}',
}, {
    message: 'should not crash on transparent in webkit tap highlight color',
    fixture: 'h1{-webkit-tap-highlight-color:transparent}',
    expected: 'h1{-webkit-tap-highlight-color:transparent}',
}, {
    message: 'should not crash on inherit in webkit tap highlight color',
    fixture: 'h1{-webkit-tap-highlight-color:inherit}',
    expected: 'h1{-webkit-tap-highlight-color:inherit}',
}, {
    message: 'should not minify in filter properties',
    fixture: 'h1{filter:progid:DXImageTransform.Microsoft.gradient(startColorstr= #000000,endColorstr= #ffffff);}',
    expected: 'h1{filter:progid:DXImageTransform.Microsoft.gradient(startColorstr= #000000,endColorstr= #ffffff);}',
}, {
    message: 'should minify color stops',
    fixture: 'h1{background-image:-webkit-gradient(linear,50% 0%,50% 100%,color-stop(1px, #fbfbfb),color-stop(1px, #ffffff),color-stop(2px, #ffffff),color-stop(2px, #fbfbfb),color-stop(100%, #ececec))}',
    expected: 'h1{background-image:-webkit-gradient(linear,50% 0%,50% 100%,color-stop(1px, #fbfbfb),color-stop(1px, #fff),color-stop(2px, #fff),color-stop(2px, #fbfbfb),color-stop(100%, #ececec))}',
}, {
    message: 'should not minify in calc values',
    fixture: 'h1{width:calc(100vw / 2 - 6px + 0)}',
    expected: 'h1{width:calc(100vw / 2 - 6px + 0)}',
}, {
    message: 'should minify hex colors without keywords',
    fixture: 'h1{background:linear-gradient(#ffffff,#999999) no-repeat;}',
    expected: 'h1{background:linear-gradient(#fff,#999) no-repeat;}',
}, {
    message: 'should not mangle percentage based rgba values',
    fixture: 'h1{color:rgba(50%,50%,50%,0.5)}',
    expected: 'h1{color:hsla(0,0%,50%,.5)}',
}, {
    message: 'should convert percentage based rgba values',
    fixture: 'h1{color:rgb(100%,100%,100%)}',
    expected: 'h1{color:#fff}',
}, {
    message: 'should handle errored cases',
    fixture: 'h1{color:rgb(50%, 23, 54)}',
    expected: 'h1{color:rgb(50%, 23, 54)}',
}];

function process (css, options) {
    return postcss(plugin(options)).process(css).css;
}

tests.forEach(({message, fixture, expected, options = {}}) => {
    test(message, t => {
        t.deepEqual(process(fixture, options), expected);
    });
});

test('should use the postcss plugin api', t => {
    t.truthy(plugin().postcssVersion, 'should be able to access version');
    t.deepEqual(plugin().postcssPlugin, name, 'should be able to access name');
});
