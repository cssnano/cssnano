import { test, describe } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import { addTests } from './helpers/boxTests.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('fallbacks', () => {
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

describe('support-dependent env() merge blocking', () => {
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

describe('newer syntax a browser may reject', () => {
  test(
    'should keep margin:1px before margin:5dvh because browsers without dynamic viewport units fall back to 1px',
    passthroughCSS('a{margin:1px;margin:5dvh}')
  );

  test(
    'should keep margin:1px before margin-top:5dvh because a merged shorthand would be dropped whole where dvh is unsupported',
    passthroughCSS('a{margin:1px;margin-top:5dvh}')
  );

  test(
    'should keep the merged margin before margin-top:5dvh when four longhands filled it because browsers without dvh fall back to the shorthand',
    processCSS(
      'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px;margin-top:5dvh}',
      'a{margin:1px;margin-top:5dvh}'
    )
  );

  test(
    'should not merge four margin longhands when one side uses dvh because browsers without it would lose all four sides',
    passthroughCSS(
      'a{margin-top:1px;margin-right:5dvh;margin-bottom:1px;margin-left:1px}'
    )
  );

  test(
    'should keep a margin before its -webkit-calc() duplicate because engines without the prefix fall back to it',
    passthroughCSS('a{margin-top:1px;margin-top:-webkit-calc(2px)}')
  );

  test(
    'should still drop margin:1px before margin:2em because every browser parses both',
    processCSS('a{margin:1px;margin:2em}', 'a{margin:2em}')
  );
});

describe('repeated box property', () => {
  const legacy = { overrideBrowserslist: ['ie 11'] };

  test(
    'keeps the earlier physical longhand because a browser without the cap unit drops the later one',
    passthroughCSS('a{margin-top:1px;margin-top:1cap}', legacy)
  );

  test(
    'keeps the earlier flow-relative longhand because a browser without the cap unit drops the later one',
    passthroughCSS('a{margin-block-start:1px;margin-block-start:1cap}', legacy)
  );

  test(
    'keeps the earlier shorthand in an at-rule because a browser without the cap unit drops the later one',
    passthroughCSS('@page{margin:1px;margin:1cap}', legacy)
  );

  test(
    'discards the earlier physical longhand when the later one needs no support',
    processCSS('a{margin-top:1px;margin-top:2px}', 'a{margin-top:2px}', legacy)
  );

  test(
    'discards the earlier shorthand in an at-rule when the later one needs no support',
    processCSS('@page{margin:1px;margin:2px}', '@page{margin:2px}', legacy)
  );

  test(
    'discards the earlier flow-relative longhand when the later one needs no support',
    processCSS(
      'a{margin-block-start:1px;margin-block-start:2px}',
      'a{margin-block-start:2px}',
      legacy
    )
  );
});
