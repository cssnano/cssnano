import test from 'ava';
import plugin from '..';
import {processCSSFactory} from '../../../../util/testHelpers';

const {processCSS} = processCSSFactory(plugin);

function addTests (...tests) {
    tests.forEach(({message, fixture, expected}) => {
        test(
            message.replace(/box/g, 'margin'),
            processCSS,
            fixture.replace(/box/g, 'margin'),
            expected.replace(/box/g, 'margin')
        );
        test(
            message.replace(/box/g, 'padding'),
            processCSS,
            fixture.replace(/box/g, 'padding'),
            expected.replace(/box/g, 'padding')
        );
    });
}

addTests({
    message: 'should merge box values',
    fixture: 'h1{box-top:10px;box-right:20px;box-bottom:30px;box-left:40px}',
    expected: 'h1{box:10px 20px 30px 40px}',
}, {
    message: 'should merge box values with !important',
    fixture: 'h1{box-top:10px!important;box-right:20px!important;box-bottom:30px!important;box-left:40px!important}',
    expected: 'h1{box:10px 20px 30px 40px!important}',
}, {
    message: 'should merge & then condense box values',
    fixture: 'h1{box-top:10px;box-bottom:10px;box-left:10px;box-right:10px}',
    expected: 'h1{box:10px}',
}, {
    message: 'should not merge box values with mixed !important',
    fixture: 'h1{box-top:10px!important;box-right:20px;box-bottom:30px!important;box-left:40px}',
    expected: 'h1{box-top:10px!important;box-right:20px;box-bottom:30px!important;box-left:40px}',
}, {
    message: 'should convert 4 values to 1 (box)',
    fixture: 'h1{box:10px 10px 10px 10px}',
    expected: 'h1{box:10px}',
}, {
    message: 'should convert 3 values to 1 (box)',
    fixture: 'h1{box:10px 10px 10px}',
    expected: 'h1{box:10px}',
}, {
    message: 'should convert 3 values to 2 (box)',
    fixture: 'h1{box:10px 20px 10px}',
    expected: 'h1{box:10px 20px}',
}, {
    message: 'should convert 2 values to 1 (box)',
    fixture: 'h1{box:10px 10px}',
    expected: 'h1{box:10px}',
}, {
    message: 'should convert 1 value to 1 (box)',
    fixture: 'h1{box:10px}',
    expected: 'h1{box:10px}',
}, {
    message: 'should convert 4 values to 2 (box)',
    fixture: 'h1{box:10px 20px 10px 20px}',
    expected: 'h1{box:10px 20px}',
}, {
    message: 'should convert 4 values to 3 (box)',
    fixture: 'h1{box:10px 20px 30px 20px}',
    expected: 'h1{box:10px 20px 30px}',
}, {
    message: 'should convert 4 values to 4 (box)',
    fixture: 'h1{box:10px 20px 30px 40px}',
    expected: 'h1{box:10px 20px 30px 40px}',
}, {
    message: 'should not mangle calc values (box)',
    fixture: 'h1{box:1px 1px calc(0.5em + 1px)}',
    expected: 'h1{box:1px 1px calc(0.5em + 1px)}',
}, {
    message: 'should merge box-left with box',
    fixture: 'h1{box:10px 20px;box-left:10px}',
    expected: 'h1{box:10px 20px 10px 10px}',
}, {
    message: 'should merge !important and normal box values',
    fixture: 'h1{box-left:10px;box-left:20px!important;box-right:10px;box-right:20px!important;box-top:10px;box-top:20px!important;box-bottom:10px;box-bottom:20px!important}',
    expected: 'h1{box:10px;box:20px!important}',
}, {
    message: 'should not merge declarations with hacks (box)',
    fixture: 'h1{box:4px 0;_box-top:1px}',
    expected: 'h1{box:4px 0;_box-top:1px}',
}, {
    message: 'should not merge declarations with hacks (box) (2)',
    fixture: 'h1{box:4px 0;box-top:1px\\9}',
    expected: 'h1{box:4px 0;box-top:1px\\9}',
}, {
    message: 'should convert 2 values to 1 with an unrelated inherit (box)',
    fixture: '.ui.table td{box:0.71428571em 0.71428571em;text-align:inherit}',
    expected: '.ui.table td{box:0.71428571em;text-align:inherit}',
}, {
    message: 'should not explode box: inherit',
    fixture: 'h1{box:inherit}',
    expected: 'h1{box:inherit}',
}, {
    message: 'should not merge declarations with hacks',
    fixture: 'h1{box:4px 0 0 0;box-top:1px\\9}',
    expected: 'h1{box:4px 0 0;box-top:1px\\9}',
}, {
    message: 'should preserve nesting level',
    fixture: 'section{h1{box:0 48px}}',
    expected: 'section{h1{box:0 48px}}',
}, {
    message: 'should override shorthand property',
    fixture: 'h1{box:10px;box-left:5px}',
    expected: 'h1{box:10px 10px 10px 5px}',
}, {
    message: 'should overwrite some box props and save fallbacks',
    fixture: 'h1{box-top:10px;box-right:var(--variable);box-right:15px;box-bottom:var(--variable);box-bottom:20px;box-left:25px;box-top:var(--variable);box-left:var(--variable)}',
    expected: 'h1{box:10px 15px 20px 25px;box-top:var(--variable);box-left:var(--variable)}',
}, {
    message: 'should not explode box props with custom properties',
    fixture: 'h1{box-bottom:var(--variable)}',
    expected: 'h1{box-bottom:var(--variable)}',
}, {
    message: 'should preserve case of custom properties',
    fixture: 'h1{box-top:10px;box-right:var(--fooBar);box-right:15px;box-bottom:var(--fooBar);box-bottom:20px;box-left:25px;box-top:var(--fooBar);box-left:var(--fooBar)}',
    expected: 'h1{box:10px 15px 20px 25px;box-top:var(--fooBar);box-left:var(--fooBar)}',
}, {
    message: 'should not merge incomplete box props where one has an unset property',
    fixture: 'h1{box-bottom:10px;box-top:unset;box-left:20px}',
    expected: 'h1{box-bottom:10px;box-top:unset;box-left:20px}',
}, {
    message: 'should not merge incomplete box props where one has an initial property',
    fixture: 'h1{box-bottom:10px;box-top:initial;box-left:20px}',
    expected: 'h1{box-bottom:10px;box-top:initial;box-left:20px}',
}, {
    message: 'should not merge incomplete box props where one has an inherit property',
    fixture: 'h1{box-bottom:10px;box-top:initial;box-left:20px}',
    expected: 'h1{box-bottom:10px;box-top:initial;box-left:20px}',
}, {
    message: 'should not merge complete box props where one has an unset property',
    fixture: 'h1{box-bottom:10px;box-top:unset;box-left:20px;box-right:20px}',
    expected: 'h1{box-bottom:10px;box-top:unset;box-left:20px;box-right:20px}',
}, {
    message: 'should not merge complete box props where one has an initial property',
    fixture: 'h1{box-bottom:10px;box-top:initial;box-left:20px;box-right:20px}',
    expected: 'h1{box-bottom:10px;box-top:initial;box-left:20px;box-right:20px}',
}, {
    message: 'should not merge complete box props where one has an inherit property',
    fixture: 'h1{box-bottom:10px;box-top:initial;box-left:20px;box-right:20px}',
    expected: 'h1{box-bottom:10px;box-top:initial;box-left:20px;box-right:20px}',
}, {
    message: 'should not merge box props where there is a mix of reserved properties',
    fixture: 'h1{box-bottom:unset;box-top:initial;box-left:inherit;box-right:initial}',
    expected: 'h1{box-bottom:unset;box-top:initial;box-left:inherit;box-right:initial}',
}, {
    message: 'should merge box props when they are all unset',
    fixture: 'h1{box-bottom:unset;box-top:unset;box-left:unset;box-right:unset}',
    expected: 'h1{box:unset}',
}, {
    message: 'should merge box props when they are all initial',
    fixture: 'h1{box-bottom:initial;box-top:initial;box-left:initial;box-right:initial}',
    expected: 'h1{box:initial}',
}, {
    message: 'should merge box props when they are all inherit',
    fixture: 'h1{box-bottom:inherit;box-top:inherit;box-left:inherit;box-right:inherit}',
    expected: 'h1{box:inherit}',
});
