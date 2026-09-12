import { test, suite } from 'node:test';
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
    message:
      'should not merge incomplete box props where one has an unset property',
    fixture: 'h1{box-bottom:10px;box-top:unset;box-left:20px}',
    expected: (prop) =>
      `h1{${prop}-bottom:10px;${prop}-top:unset;${prop}-left:20px}`,
  },
  {
    message:
      'should not merge incomplete box props where one has an unset property (uppercase)',
    fixture: 'h1{box-bottom:10px;box-top:UNSET;box-left:20px}',
    expected: (prop) =>
      `h1{${prop}-bottom:10px;${prop}-top:UNSET;${prop}-left:20px}`,
  },
  {
    message:
      'should not merge incomplete box props where one has an initial property',
    fixture: 'h1{box-bottom:10px;box-top:initial;box-left:20px}',
    expected: (prop) =>
      `h1{${prop}-bottom:10px;${prop}-top:initial;${prop}-left:20px}`,
  },
  {
    message:
      'should not merge incomplete box props where one has an initial property (uppercase)',
    fixture: 'h1{box-bottom:10px;box-top:INITIAL;box-left:20px}',
    expected: (prop) =>
      `h1{${prop}-bottom:10px;${prop}-top:INITIAL;${prop}-left:20px}`,
  },
  {
    message:
      'should not merge incomplete box props where one has an inherit property',
    fixture: 'h1{box-bottom:10px;box-top:inherit;box-left:20px}',
    expected: (prop) =>
      `h1{${prop}-bottom:10px;${prop}-top:inherit;${prop}-left:20px}`,
  },
  {
    message:
      'should not merge incomplete box props where one has an inherit property (uppercase)',
    fixture: 'h1{box-bottom:10px;box-top:INHERIT;box-left:20px}',
    expected: (prop) =>
      `h1{${prop}-bottom:10px;${prop}-top:INHERIT;${prop}-left:20px}`,
  },
  {
    message:
      'should not merge complete box props where one has an unset property',
    fixture: 'h1{box-bottom:10px;box-top:unset;box-left:20px;box-right:20px}',
    expected: (prop) =>
      `h1{${prop}-bottom:10px;${prop}-top:unset;${prop}-left:20px;${prop}-right:20px}`,
  },
  {
    message:
      'should not merge complete box props where one has an unset property (uppercase)',
    fixture: 'h1{box-bottom:10px;box-top:UNSET;box-left:20px;box-right:20px}',
    expected: (prop) =>
      `h1{${prop}-bottom:10px;${prop}-top:UNSET;${prop}-left:20px;${prop}-right:20px}`,
  },
  {
    message:
      'should not merge complete box props where one has an initial property',
    fixture: 'h1{box-bottom:10px;box-top:initial;box-left:20px;box-right:20px}',
    expected: (prop) =>
      `h1{${prop}-bottom:10px;${prop}-top:initial;${prop}-left:20px;${prop}-right:20px}`,
  },
  {
    message:
      'should not merge complete box props where one has an initial property (uppercase)',
    fixture: 'h1{box-bottom:10px;box-top:INITIAL;box-left:20px;box-right:20px}',
    expected: (prop) =>
      `h1{${prop}-bottom:10px;${prop}-top:INITIAL;${prop}-left:20px;${prop}-right:20px}`,
  },
  {
    message:
      'should not merge complete box props where one has an inherit property',
    fixture: 'h1{box-bottom:10px;box-top:inherit;box-left:20px;box-right:20px}',
    expected: (prop) =>
      `h1{${prop}-bottom:10px;${prop}-top:inherit;${prop}-left:20px;${prop}-right:20px}`,
  },
  {
    message:
      'should not merge complete box props where one has an inherit property (uppercase)',
    fixture: 'h1{box-bottom:10px;box-top:INHERIT;box-left:20px;box-right:20px}',
    expected: (prop) =>
      `h1{${prop}-bottom:10px;${prop}-top:INHERIT;${prop}-left:20px;${prop}-right:20px}`,
  },
  {
    message:
      'should not merge box props where there is a mix of reserved properties',
    fixture:
      'h1{box-bottom:unset;box-top:initial;box-left:inherit;box-right:initial}',
    expected: (prop) =>
      `h1{${prop}-bottom:unset;${prop}-top:initial;${prop}-left:inherit;${prop}-right:initial}`,
  },
  {
    message:
      'should not merge box props where there is a mix of reserved properties (uppercase)',
    fixture:
      'h1{box-bottom:UNSET;box-top:INITIAL;box-left:INHERIT;box-right:INITIAL}',
    expected: (prop) =>
      `h1{${prop}-bottom:UNSET;${prop}-top:INITIAL;${prop}-left:INHERIT;${prop}-right:INITIAL}`,
  },
  {
    message: 'should merge box props when they are all unset',
    fixture:
      'h1{box-bottom:unset;box-top:unset;box-left:unset;box-right:unset}',
    expected: 'h1{box:unset}',
  },
  {
    message: 'should merge box props when they are all unset (uppercase)',
    fixture:
      'h1{box-bottom:UNSET;box-top:UNSET;box-left:UNSET;box-right:UNSET}',
    expected: 'h1{box:UNSET}',
  },
  {
    message: 'should merge box props when they are all initial',
    fixture:
      'h1{box-bottom:initial;box-top:initial;box-left:initial;box-right:initial}',
    expected: 'h1{box:initial}',
  },
  {
    message: 'should merge box props when they are all initial (uppercase)',
    fixture:
      'h1{box-bottom:INITIAL;box-top:INITIAL;box-left:INITIAL;box-right:INITIAL}',
    expected: 'h1{box:INITIAL}',
  },
  {
    message: 'should merge box props when they are all inherit',
    fixture:
      'h1{box-bottom:inherit;box-top:inherit;box-left:inherit;box-right:inherit}',
    expected: 'h1{box:inherit}',
  },
  {
    message: 'should merge box props when they are all inherit (uppercase)',
    fixture:
      'h1{box-bottom:INHERIT;box-top:INHERIT;box-left:INHERIT;box-right:INHERIT}',
    expected: 'h1{box:INHERIT}',
  },
  {
    message: 'should not merge box props when one has a revert property',
    fixture: 'h1{box:10px;box-left:revert}',
    expected: (prop) => `h1{${prop.toLowerCase()}:10px;${prop}-left:revert}`,
  },
  {
    message: 'should handle empty box properties',
    fixture: 'h1{box:;}',
    expected: (prop) => `h1{${prop}:;}`,
  }
);

suite('revert-layer and revert-rule keywords', () => {
  addTests(
    {
      message:
        'should not merge box props where one has a revert-layer property',
      fixture:
        'h1{box-bottom:10px;box-top:revert-layer;box-left:20px;box-right:20px}',
      expected: (prop) =>
        `h1{${prop}-bottom:10px;${prop}-top:revert-layer;${prop}-left:20px;${prop}-right:20px}`,
    },
    {
      message:
        'should not merge box props where one has a revert-rule property',
      fixture:
        'h1{box-bottom:10px;box-top:revert-rule;box-left:20px;box-right:20px}',
      expected: (prop) =>
        `h1{${prop}-bottom:10px;${prop}-top:revert-rule;${prop}-left:20px;${prop}-right:20px}`,
    }
  );
});

suite('all reset boundaries', () => {
  test(
    'does not merge margin declarations across an escaped all reset',
    processCSS(
      String.raw`a{margin-top:1px;\61ll:initial;margin-right:2px;margin-bottom:3px;margin-left:4px}`,
      String.raw`a{margin-top:1px;\61ll:initial;margin-right:2px;margin-bottom:3px;margin-left:4px}`
    )
  );

  addTests(
    {
      message: 'should not merge box declarations across a normal all reset',
      fixture:
        'h1{box-top:1px;box-right:2px;all:initial;box-bottom:3px;box-left:4px}',
      expected: (prop) =>
        `h1{${prop}-top:1px;${prop}-right:2px;all:initial;${prop}-bottom:3px;${prop}-left:4px}`,
    },
    {
      message:
        'should not merge box declarations across an important all reset',
      fixture:
        'h1{box-top:1px!important;box-right:2px!important;all:unset!important;box-bottom:3px!important;box-left:4px!important}',
      expected: (prop) =>
        `h1{${prop}-top:1px!important;${prop}-right:2px!important;all:unset!important;${prop}-bottom:3px!important;${prop}-left:4px!important}`,
    },
    {
      message:
        'should merge box declarations across an invalid all declaration in the opposite lane',
      fixture:
        'h1{box-top:1px;box-right:2px;all:invalid!important;box-bottom:3px;box-left:4px}',
      expected: 'h1{all:invalid!important;box:1px 2px 3px 4px}',
    },
    {
      message:
        'should reduce complete box groups on both sides of an all reset',
      fixture:
        'h1{box-top:1px;box-right:1px;box-bottom:1px;box-left:1px;all:initial;box-top:2px;box-right:2px;box-bottom:2px;box-left:2px}',
      expected: 'h1{box:1px;all:initial;box:2px}',
    },
    {
      message:
        'should recognize a case-insensitive ALL reset between box declarations',
      fixture:
        'h1{box-top:1px;box-right:2px;ALL:initial;box-bottom:3px;box-left:4px}',
      expected: (prop) =>
        `h1{${prop}-top:1px;${prop}-right:2px;ALL:initial;${prop}-bottom:3px;${prop}-left:4px}`,
    }
  );
});
