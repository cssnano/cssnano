import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

function addTests(...tests) {
  for (const { message, fixture, expected } of tests) {
    const isExpectedFunc = typeof expected === 'function';

    test(
      message.replace(/box/gi, 'margin'),
      processCSS(
        fixture.replace(/box/gi, 'margin'),
        isExpectedFunc
          ? expected('margin')
          : expected.replace(/box/gi, 'margin')
      )
    );
    test(
      message.replace(/box/gi, 'MARGIN'),
      processCSS(
        fixture.replace(/box/gi, 'MARGIN'),
        isExpectedFunc
          ? expected('MARGIN')
          : expected.replace(/box/gi, 'margin')
      )
    );
    test(
      message.replace(/box/gi, 'padding'),
      processCSS(
        fixture.replace(/box/gi, 'padding'),
        isExpectedFunc
          ? expected('padding')
          : expected.replace(/box/gi, 'padding')
      )
    );
    test(
      message.replace(/box/gi, 'PADDING'),
      processCSS(
        fixture.replace(/box/gi, 'PADDING'),
        isExpectedFunc
          ? expected('PADDING')
          : expected.replace(/box/gi, 'padding')
      )
    );
  }
}

addTests(
  {
    message: 'should merge box values',
    fixture: 'h1{box-top:10px;box-right:20px;box-bottom:30px;box-left:40px}',
    expected: 'h1{box:10px 20px 30px 40px}',
  },
  {
    message: 'should merge box values with !important',
    fixture:
      'h1{box-top:10px!important;box-right:20px!important;box-bottom:30px!important;box-left:40px!important}',
    expected: 'h1{box:10px 20px 30px 40px!important}',
  },
  {
    message: 'should merge box values with hypot',
    fixture:
      'h1{box-top:hypot(1px,2px);box-right:hypot(1px,2px);box-bottom:hypot(1px,2px);box-left:hypot(1px,2px)}',
    expected: 'h1{box:hypot(1px,2px)}',
  },
  {
    message: 'should merge & then condense box values',
    fixture: 'h1{box-top:10px;box-bottom:10px;box-left:10px;box-right:10px}',
    expected: 'h1{box:10px}',
  },
  {
    message: 'should not merge box values with mixed !important',
    fixture:
      'h1{box-top:10px!important;box-right:20px;box-bottom:30px!important;box-left:40px}',
    expected: (prop) =>
      `h1{${prop}-top:10px!important;${prop}-right:20px;${prop}-bottom:30px!important;${prop}-left:40px}`,
  },
  {
    message: 'should convert 4 values to 1 (box)',
    fixture: 'h1{box:10px 10px 10px 10px}',
    expected: 'h1{box:10px}',
  },
  {
    message: 'should convert 3 values to 1 (box)',
    fixture: 'h1{box:10px 10px 10px}',
    expected: 'h1{box:10px}',
  },
  {
    message: 'should convert 3 values to 2 (box)',
    fixture: 'h1{box:10px 20px 10px}',
    expected: 'h1{box:10px 20px}',
  },
  {
    message: 'should convert 2 values to 1 (box)',
    fixture: 'h1{box:10px 10px}',
    expected: 'h1{box:10px}',
  },
  {
    message: 'should convert 1 value to 1 (box)',
    fixture: 'h1{box:10px}',
    expected: 'h1{box:10px}',
  },
  {
    message: 'should convert 4 values to 2 (box)',
    fixture: 'h1{box:10px 20px 10px 20px}',
    expected: 'h1{box:10px 20px}',
  },
  {
    message: 'should convert 4 values to 3 (box)',
    fixture: 'h1{box:10px 20px 30px 20px}',
    expected: 'h1{box:10px 20px 30px}',
  },
  {
    message: 'should convert 4 values to 4 (box)',
    fixture: 'h1{box:10px 20px 30px 40px}',
    expected: 'h1{box:10px 20px 30px 40px}',
  },
  {
    message: 'should not mangle calc values (box)',
    fixture: 'h1{box:1px 1px calc(0.5em + 1px)}',
    expected: 'h1{box:1px 1px calc(0.5em + 1px)}',
  },
  {
    message: 'should merge box-left with box',
    fixture: 'h1{box:10px 20px;box-left:10px}',
    expected: 'h1{box:10px 20px 10px 10px}',
  },
  {
    message: 'should merge !important and normal box values',
    fixture:
      'h1{box-left:10px;box-left:20px!important;box-right:10px;box-right:20px!important;box-top:10px;box-top:20px!important;box-bottom:10px;box-bottom:20px!important}',
    expected: 'h1{box:10px;box:20px!important}',
  },
  {
    message: 'should not merge declarations with hacks (box)',
    fixture: 'h1{box:4px 0;_box-top:1px}',
    expected: (prop) => `h1{${prop.toLowerCase()}:4px 0;_${prop}-top:1px}`,
  },
  {
    message: 'should not merge declarations with hacks (box) (2)',
    fixture: 'h1{box:4px 0;box-top:1px\\9}',
    expected: (prop) => `h1{${prop.toLowerCase()}:4px 0;${prop}-top:1px\\9}`,
  },
  {
    message: 'should convert 2 values to 1 with an unrelated inherit (box)',
    fixture: '.ui.table td{box:0.71428571em 0.71428571em;text-align:inherit}',
    expected: '.ui.table td{box:0.71428571em;text-align:inherit}',
  },
  {
    message: 'should not explode box: inherit',
    fixture: 'h1{box:inherit}',
    expected: (prop) => `h1{${prop}:inherit}`,
  },
  {
    message: 'should not explode box: inherit (uppercase)',
    fixture: 'h1{box:INHERIT}',
    expected: (prop) => `h1{${prop}:INHERIT}`,
  },
  {
    message: 'should not merge declarations with hacks (box) #3',
    fixture: 'h1{box:4px 0 0 0;box-top:1px\\9}',
    expected: (prop) => `h1{${prop.toLowerCase()}:4px 0 0;${prop}-top:1px\\9}`,
  },
  {
    message: 'should preserve nesting level (box)',
    fixture: 'section{h1{box:0 48px}}',
    expected: 'section{h1{box:0 48px}}',
  },
  {
    message: 'should override shorthand property (box)',
    fixture: 'h1{box:10px;box-left:5px}',
    expected: 'h1{box:10px 10px 10px 5px}',
  },
  {
    message: 'should overwrite some box props and save fallbacks',
    fixture:
      'h1{box-top:10px;box-right:var(--variable);box-right:15px;box-bottom:var(--variable);box-bottom:20px;box-left:25px;box-top:var(--variable);box-left:var(--variable)}',
    expected: (prop) =>
      `h1{${prop.toLowerCase()}:10px 15px 20px 25px;${prop}-top:var(--variable);${prop}-left:var(--variable)}`,
  },
  {
    message: 'should not explode box props with custom properties',
    fixture: 'h1{box-bottom:var(--variable)}',
    expected: (prop) => `h1{${prop}-bottom:var(--variable)}`,
  },
  {
    message: 'should not merge custom properties',
    fixture: `.foo {
  box-top: var(--padding-top);
  box-bottom: var(--padding-bottom);
  box-left: var(--padding-left);
  box-right: var(--padding-right);
}`,
    expected: (prop) => `.foo {
  ${prop}-top: var(--padding-top);
  ${prop}-bottom: var(--padding-bottom);
  ${prop}-left: var(--padding-left);
  ${prop}-right: var(--padding-right);
}`,
  },
  {
    message: 'should preserve case of custom properties (box)',
    fixture:
      'h1{box-top:10px;box-right:var(--fooBar);box-right:15px;box-bottom:var(--fooBar);box-bottom:20px;box-left:25px;box-top:var(--fooBar);box-left:var(--fooBar)}',
    expected: (prop) =>
      `h1{${prop.toLowerCase()}:10px 15px 20px 25px;${prop}-top:var(--fooBar);${prop}-left:var(--fooBar)}`,
  }
);
