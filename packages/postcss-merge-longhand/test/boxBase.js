import nodetest from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { test, suite } = nodetest;
const { processCSS, passthroughCSS } = processCSSFactory(plugin);

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
  },
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

suite('fallbacks', () => {
  addTests(
    {
      message: 'should save fallbacks for box props that use env()',
      fixture:
        'h1{box:16px 35px;box-bottom:calc(constant(safe-area-inset-bottom) + 16px);box-bottom:calc(env(safe-area-inset-bottom) + 16px)}',
      expected: (prop) =>
        `h1{${prop.toLowerCase()}:16px 35px;${prop}-bottom:calc(constant(safe-area-inset-bottom) + 16px);${prop}-bottom:calc(env(safe-area-inset-bottom) + 16px)}`,
    },
    {
      message: 'should not merge box props over a fallback',
      fixture:
        'h1{box-top:1px;box-right:2px;box-bottom:3px;box-bottom:env(safe-area-inset-bottom);box-left:4px}',
      expected: (prop) =>
        `h1{${prop}-top:1px;${prop}-right:2px;${prop}-bottom:3px;${prop}-bottom:env(safe-area-inset-bottom);${prop}-left:4px}`,
    },
    {
      message: 'should merge box props that only repeat a plain value',
      fixture: 'h1{box:1px;box-bottom:2px;box-bottom:3px}',
      expected: (prop) => `h1{${prop.toLowerCase()}:1px 1px 3px}`,
    },
    {
      message: 'should merge box props when the later value drops a function',
      fixture:
        'h1{box-bottom:env(safe-area-inset-bottom);box-bottom:3px;box-top:1px;box-right:2px;box-left:4px}',
      expected: (prop) => `h1{${prop.toLowerCase()}:1px 2px 3px 4px}`,
    },
    {
      message: 'should not merge box props over a fallback of zero',
      fixture:
        'h1{box-bottom:0;box-bottom:env(safe-area-inset-bottom);box-top:10px;box-left:10px;box-right:10px}',
      expected: (prop) =>
        `h1{${prop}-bottom:0;${prop}-bottom:env(safe-area-inset-bottom);${prop}-top:10px;${prop}-left:10px;${prop}-right:10px}`,
    },
    {
      message:
        'should keep the fallback for a box prop that reaches for calc()',
      fixture: 'h1{box-bottom:1px;box-bottom:calc(1px + 1em)}',
      expected: (prop) =>
        `h1{${prop}-bottom:1px;${prop}-bottom:calc(1px + 1em)}`,
    },
    {
      message: 'should keep the fallback for a box prop that reaches for max()',
      fixture: '.my-class{box-right:22px;box-right:max(4%, 22px)}',
      expected: (prop) =>
        `.my-class{${prop}-right:22px;${prop}-right:max(4%, 22px)}`,
    }
  );

  test(
    'should keep the constant() fallback for a safe area inset',
    passthroughCSS(`.my-class {
padding: 16px 35px;
padding-bottom: calc(constant(safe-area-inset-bottom) + 16px);
padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
}
`)
  );
});

suite('support-dependent env() merge blocking', () => {
  /* When a shorthand contains a support-dependent function, a later longhand
   * override must preserve that function's declaration instead of merging it into the
   * shorthand. */
  test(
    'should not merge when a longhand requires env() support',
    processCSS(
      'a{padding-top:0;padding:env(x) 3px 1px;padding:var(--v);padding-top:1px}',
      'a{padding:env(x) 3px 1px;padding:var(--v);padding-top:1px}'
    )
  );

  /* A support-dependent longhand prevents the shorthand from consuming that
   * position, so the merge applies properties that require no support from the
   * first layer. */
  test(
    'should not merge when a single side in a box is support-dependent',
    processCSS(
      'a{padding-top:1px;padding-right:1px;padding-bottom:1px;padding-left:1px;padding-top:2px;padding-right:2px;padding-bottom:2px;padding-left:env(x)}',
      'a{padding:2px 2px 2px 1px;padding-left:env(x)}'
    )
  );

  test(
    'should not merge a support-dependent shorthand into plain longhand',
    passthroughCSS('a{padding:env(x) 3px 1px;padding-top:1px}')
  );

  test(
    'should not merge a longhand over a fallback',
    passthroughCSS('a{padding:1px;padding-top:env(x)}')
  );

  test(
    'should merge complete support-dependent declarations when longhands do not contain fallbacks',
    processCSS(
      'a{padding-top:1px;padding-right:1px;padding-bottom:1px;padding-left:1px;padding-top:env(a);padding-right:env(a);padding-bottom:env(a);padding-left:env(a)}',
      'a{padding:1px;padding:env(a)}'
    )
  );
});

suite('invalid value handling', () => {
  /* User agents ignore invalid values, so merging declaration might change the rendered result.
   */
  test(
    'should not let a margin declaration with two many values override the one before it',
    passthroughCSS('a{margin:1px;margin:1px 2em 0 1px 2em}')
  );

  test(
    'should not let an over-long padding override the one before it',
    passthroughCSS('a{padding:1px;padding:1px 2em 0 1px 2em}')
  );

  test(
    'should not let a multi-value longhand override the one before it',
    passthroughCSS('a{margin-left:1px;margin-left:1px 2em}')
  );

  test(
    'should not read a colour as a length',
    passthroughCSS('a{margin-left:1px;margin-left:red}')
  );

  test(
    'should not read a border style as a length',
    passthroughCSS('a{padding:5px;padding:dotted none}')
  );

  /* Functions the plugin cannot evaluate (calc, env, var) are assumed valid. */

  test(
    'should not read a url as a length',
    passthroughCSS(
      'a{padding-top:1px;padding-right:1px;padding-bottom:1px;padding-left:1px;padding-top:url(x)}'
    )
  );

  test(
    'should not merge a longhand when the resulting shorthand might have a different browser support',
    passthroughCSS('a{margin-left:1px;margin-left:rgb(0 0 0)}')
  );

  /* `revert-rule` is defined in the CSS spec but no browser implements it,
   * so the declaration counts as invalid and earlier declarations remain in effect. */
  test(
    'should not let a CSS-wide keyword no browser ships override the one before it',
    passthroughCSS('a{padding-top:1px;padding:revert-rule}')
  );

  test(
    'should pass through a length missing its unit',
    passthroughCSS('a{margin-top:1px;margin-top:5}')
  );

  test(
    'should pass through a negative padding',
    passthroughCSS('a{padding-top:1px;padding-top:-5px}')
  );

  test(
    'should pass through auto in a padding',
    passthroughCSS('a{padding-top:1px;padding-top:auto}')
  );

  test(
    'should not merge longhands around an invalid shorthand',
    passthroughCSS(
      'a{margin:red;margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}'
    )
  );

  test(
    'should not explode a shorthand the user agent ignores',
    passthroughCSS('a{margin:1px 2em 0 1px 2em;margin-top:5px}')
  );

  test(
    'should not discard a longhand an ignored shorthand appears to override',
    passthroughCSS('a{margin-left:1px;margin:red}')
  );

  test(
    'should pass through an invalid value when property name is uppercase',
    passthroughCSS('a{MARGIN-LEFT:1px;MARGIN-LEFT:red}')
  );

  test(
    'should not merge important! longhands around a invalid shorthand',
    passthroughCSS(
      'a{padding:auto;padding-top:1px!important;padding-right:1px!important;padding-bottom:1px!important;padding-left:1px!important}'
    )
  );
});
/* The other direction: the check has to merge valid values. */
suite('valid values merge', () => {
  test(
    'should merge auto in a margin',
    processCSS(
      'a{margin-top:0;margin-right:auto;margin-bottom:0;margin-left:auto}',
      'a{margin:0 auto}'
    )
  );

  test(
    'should merge a negative margin',
    processCSS(
      'a{margin-top:-5px;margin-right:-5px;margin-bottom:-5px;margin-left:-5px}',
      'a{margin:-5px}'
    )
  );

  test(
    'should merge zero without a unit',
    processCSS(
      'a{padding-top:0;padding-right:0;padding-bottom:0;padding-left:0}',
      'a{padding:0}'
    )
  );

  test(
    'should merge a percentage',
    processCSS(
      'a{padding-top:10%;padding-right:10%;padding-bottom:10%;padding-left:10%}',
      'a{padding:10%}'
    )
  );

  test(
    'should merge a value it cannot resolve',
    processCSS(
      'a{margin-top:calc(1px + 2%);margin-right:calc(1px + 2%);margin-bottom:calc(1px + 2%);margin-left:calc(1px + 2%)}',
      'a{margin:calc(1px + 2%)}'
    )
  );

  test(
    'should merge a length in scientific notation',
    processCSS(
      'a{padding-top:1e2px;padding-right:1e2px;padding-bottom:1e2px;padding-left:1e2px}',
      'a{padding:1e2px}'
    )
  );

  test(
    'should merge the family a invalid declaration does not belong to',
    processCSS(
      'a{margin:red;padding-top:1px;padding-right:1px;padding-bottom:1px;padding-left:1px}',
      'a{margin:red;padding:1px}'
    )
  );

  test(
    'should merge a rule whose only invalid value is a stylehack',
    processCSS(
      'h1{margin-top:1px\\9;margin:4px 0 0 0}',
      'h1{margin-top:1px\\9;margin:4px 0 0}'
    )
  );
});
