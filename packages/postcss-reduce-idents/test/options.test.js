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
  test('encoder', async () => {
    const arr = Array.from({ length: 1984 }, (value, index) => index);
    const cache = [];

    for (const num of arr) {
      const encoded = encode(null, num);
      cache.push(encoded);

      const indexes = cache.filter((c) => c === encoded);

      assert.strictEqual(indexes.length, 1);
    }
  });

  test('encoder gen spec', async () => {
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
      216372: 'aaaa',
      216373: 'baaa',
      216423: 'Zaaa',
      13847860: 'aaaaa',
    };
    for (const num of Object.keys(edgeCaseList)) {
      assert.strictEqual(encode(null, num), edgeCaseList[num]);
    }
  });
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
