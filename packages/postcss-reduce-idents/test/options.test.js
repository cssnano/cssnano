import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import encode from '../src/lib/encode.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Options', () => {
  test(
    'should not touch keyframes names',
    processCSS(
      [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
      ].join(''),
      [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}',
        'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}',
      ].join(''),
      { keyframes: false }
    )
  );

  test(
    'should not touch counter styles',
    processCSS(
      [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
      ].join(''),
      [
        '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}',
      ].join(''),
      { counterStyle: false }
    )
  );

  test(
    'should not touch counter functions',
    processCSS(
      [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
      ].join(''),
      [
        '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}',
        '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
      ].join(''),
      { counter: false }
    )
  );

  test(
    'should not touch grid templates',
    passthroughCSS(
      [
        'body{grid-template-areas:"head head" \n"nav  main"\n"nav  foot";}',
        'header { grid-area: head }',
        'nav{grid-area:nav}',
        'main{grid-area:main}',
        'footer{grid-area:foot}',
      ].join(''),
      { gridTemplate: false }
    )
  );

  test(
    'should allow a custom prefix',
    processCSS(
      [
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation: 100ms whiteToBlack}',
        '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
        'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
      ].join(''),
      [
        '@keyframes PREFIXwhiteToBlack{0%{color:#fff}to{color:#000}}.one{animation: 100ms PREFIXwhiteToBlack}',
        '@counter-style PREFIXcustom{system:extends decimal;suffix:"> "}ol{list-style:PREFIXcustom}',
        'body{counter-reset:PREFIXsection}h3:before{counter-increment:PREFIXsection;content:"Section" counter(PREFIXsection) ": "}',
      ].join(''),
      { encoder: (val) => `PREFIX${val}` }
    )
  );
});

describe('Encoder', () => {
  // Invert the encoder's bijective numeration here, so the contract below
  // checks against an independent position.
  const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const REMAINDER = LETTERS + '0123456789-_';

  /**
   * @param {string} word
   * @return {number}
   */
  function position(word) {
    let num = LETTERS.indexOf(word[0]);
    let place = 1;
    for (let i = 1; i < word.length; i++) {
      num += (REMAINDER.indexOf(word[i]) + 1) * 52 * place;
      place *= 64;
    }
    return num;
  }

  test('generates unique identifiers for consecutive indices', () => {
    const seen = new Set();
    for (let num = 0; num < 100000; num++) {
      const encoded = encode(num);
      assert.ok(!seen.has(encoded), `repeated ident for ${num}`);
      seen.add(encoded);
    }
  });

  test('generates unique identifiers for strided samples up to ten million', () => {
    const seen = new Set();
    // Use a stride sharing no factor with the numeration bases, so the
    // sample visits every window.
    for (let num = 0; num < 10000000; num += 4999) {
      const encoded = encode(num);
      assert.ok(!seen.has(encoded), `repeated ident for ${num}`);
      seen.add(encoded);
    }
  });

  test('generates identifiers that read as custom idents', () => {
    for (let num = 0; num < 100000; num++) {
      assert.match(encode(num), /^[a-zA-Z][\-_a-zA-Z0-9]*$/v);
    }
  });

  test('never generates an identifier a grammar reads as a keyword', () => {
    for (const word of [
      'auto',
      'dense',
      'disc',
      'ease',
      'inherit',
      'initial',
      'inline',
      'lao',
      'list-item',
      'none',
      'page',
      'span',
    ]) {
      const num = position(word);
      assert.notStrictEqual(encode(num), word);
      // Require the stepped ident to differ from its neighbours' outputs.
      const around = new Set();
      for (let offset = -2; offset <= 2; offset++) {
        around.add(encode(num + offset));
      }
      assert.strictEqual(around.size, 5);
      assert.ok(!around.has(word));
    }
  });

  test('steps over the numbering positions whose plain output is reserved', () => {
    // Step from 'lao' on, the earliest reserved position: below it the
    // mapping is plain, from it on every index lands one higher.
    const lao = position('lao');
    assert.strictEqual(position(encode(lao - 1)), lao - 1);
    assert.notStrictEqual(encode(lao), 'lao');
    assert.strictEqual(position(encode(lao)), lao + 1);
  });

  test('encoder spec', () => {
    // Cover positions below the earliest reserved word, where the mapping is
    // the plain numeration.
    const edgeCaseList = {
      0: 'a',
      1: 'b',
      51: 'Z',
      52: 'aa',
      53: 'ba',
      103: 'Za',
      104: 'ab',
      2704: 'aZ',
      2755: 'ZZ',
      2756: 'a0',
      2807: 'Z0',
      3380: 'aaa',
      3431: 'Zaa',
    };
    for (const [num, ident] of Object.entries(edgeCaseList)) {
      assert.strictEqual(encode(Number(num)), ident);
    }
  });
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
