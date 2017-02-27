import test from 'ava';
import plugin from '..';
import {usePostCSSPlugin, processCSSFactory} from '../../../../util/testHelpers';

const {passthroughCSS, processCSS} = processCSSFactory(plugin);

test(
    'should minify color values',
    processCSS,
    'h1{color:yellow}',
    'h1{color:#ff0}'
);

test(
    'should minify color values (2)',
    processCSS,
    'h1{box-shadow:0 1px 3px rgba(255, 230, 220, 0.5)}',
    'h1{box-shadow:0 1px 3px rgba(255,230,220,.5)}'
);

test(
    'should minify color values (3)',
    processCSS,
    'h1{background:hsla(134, 50%, 50%, 1)}',
    'h1{background:#40bf5e}'
);

test(
    'should minify color values (4)',
    processCSS,
    'h1{text-shadow:1px 1px 2px #000000}',
    'h1{text-shadow:1px 1px 2px #000}'
);

test(
    'should minify color values (5)',
    processCSS,
    'h1{text-shadow:1px 1px 2px rgb(255, 255, 255)}',
    'h1{text-shadow:1px 1px 2px #fff}'
);

test(
    'should minify color values (5)',
    processCSS,
    'h1{text-shadow:1px 1px 2px hsl(0,0%,100%)}',
    'h1{text-shadow:1px 1px 2px #fff}'
);

test(
    'should minify color values in background gradients',
    processCSS,
    'h1{background:linear-gradient( #ff0000,yellow )}',
    'h1{background:linear-gradient( red,#ff0 )}'
);

test(
    'should minify color values in background gradients (2)',
    processCSS,
    'h1{background:linear-gradient(yellow, orange), linear-gradient(black, rgba(255, 255, 255, 0))}',
    'h1{background:linear-gradient(#ff0, orange), linear-gradient(#000, hsla(0,0%,100%,0))}'
);

test(
    'should minify color values in background gradients (3)',
    processCSS,
    'h1{background:linear-gradient(0deg, yellow, black 40%, red)}',
    'h1{background:linear-gradient(0deg, #ff0, #000 40%, red)}'
);

test(
    'should not minify in font properties',
    passthroughCSS,
    'h1{font-family:black}'
);

test(
    'should correctly parse multiple box shadow values',
    processCSS,
    'h1{box-shadow:inset 0 1px 1px rgba(0, 0, 0, .075),0 0 8px rgba(102, 175, 233, .6)}',
    'h1{box-shadow:inset 0 1px 1px rgba(0,0,0,.075),0 0 8px rgba(102,175,233,.6)}'
);

test(
    'should make an exception for webkit tap highlight color (issue 1)',
    passthroughCSS,
    'h1{-webkit-tap-highlight-color:rgba(0,0,0,0)}'
);

test(
    'should still minify spaces in webkit tap highlight color',
    processCSS,
    'h1{-webkit-tap-highlight-color:rgba( 0, 0, 0, 0)}',
    'h1{-webkit-tap-highlight-color:rgba(0,0,0,0)}'
);

test(
    'should not crash on transparent in webkit tap highlight color',
    passthroughCSS,
    'h1{-webkit-tap-highlight-color:transparent}'
);

test(
    'should not crash on inherit in webkit tap highlight color',
    passthroughCSS,
    'h1{-webkit-tap-highlight-color:inherit}'
);

test(
    'should not minify in filter properties',
    passthroughCSS,
    'h1{filter:progid:DXImageTransform.Microsoft.gradient(startColorstr= #000000,endColorstr= #ffffff);}'
);

test(
    'should minify color stops',
    processCSS,
    'h1{background-image:-webkit-gradient(linear,50% 0%,50% 100%,color-stop(1px, #fbfbfb),color-stop(1px, #ffffff),color-stop(2px, #ffffff),color-stop(2px, #fbfbfb),color-stop(100%, #ececec))}',
    'h1{background-image:-webkit-gradient(linear,50% 0%,50% 100%,color-stop(1px, #fbfbfb),color-stop(1px, #fff),color-stop(2px, #fff),color-stop(2px, #fbfbfb),color-stop(100%, #ececec))}'
);

test(
    'should not minify in calc values',
    passthroughCSS,
    'h1{width:calc(100vw / 2 - 6px + 0)}'
);

test(
    'should minify hex colors without keywords',
    processCSS,
    'h1{background:linear-gradient(#ffffff,#999999) no-repeat;}',
    'h1{background:linear-gradient(#fff,#999) no-repeat;}'
);

test(
    'should not mangle percentage based rgba values',
    processCSS,
    'h1{color:rgba(50%,50%,50%,0.5)}',
    'h1{color:hsla(0,0%,50%,.5)}'
);

test(
    'should convert percentage based rgba values',
    processCSS,
    'h1{color:rgb(100%,100%,100%)}',
    'h1{color:#fff}'
);

test(
    'should handle errored cases',
    passthroughCSS,
    'h1{color:rgb(50%, 23, 54)}'
);

test(
    'should add extra spaces when converting rgb',
    processCSS,
    'h1{background:linear-gradient(rgb(50, 50, 50)0%,blue 100%)}',
    'h1{background:linear-gradient(#323232 0%,blue 100%)}'
);

test(
    'should add extra spaces when converting rgb (2)',
    processCSS,
    'h1{background:linear-gradient(rgba(0,0,0,0)0%, blue 100%)}',
    'h1{background:linear-gradient(transparent 0%, blue 100%)}'
);

test(
    'should bail on the "composes" property',
    passthroughCSS,
    'h1{composes:black from "styles"}'
);

test(
    'should use the postcss plugin api',
    usePostCSSPlugin,
    plugin()
);
