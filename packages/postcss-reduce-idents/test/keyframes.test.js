import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Keyframes', () => {
  test(
    'should rename keyframes',
    processCSS(
      '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
      '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}'
    )
  );

  test(
    'should rename keyframes (uppercase)',
    processCSS(
      '@KEYFRAMES whiteToBlack{0%{color:#fff}to{color:#000}}.one{ANIMATION-NAME:whiteToBlack}',
      '@KEYFRAMES a{0%{color:#fff}to{color:#000}}.one{ANIMATION-NAME:a}'
    )
  );

  test(
    'should rename multiple keyframes',
    processCSS(
      '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes fadeOut{0%{opacity:1}to{opacity:0}}.one{animation-name:whiteToBlack}.two{animation-name:fadeOut}',
      '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{opacity:1}to{opacity:0}}.one{animation-name:a}.two{animation-name:b}'
    )
  );

  test(
    'should rename multiple keyframes (uppercase)',
    processCSS(
      '@KEYFRAMES whiteToBlack{0%{color:#fff}to{color:#000}}@KEYFRAMES fadeOut{0%{opacity:1}to{opacity:0}}.one{animation-name:whiteToBlack}.two{animation-name:fadeOut}',
      '@KEYFRAMES a{0%{color:#fff}to{color:#000}}@KEYFRAMES b{0%{opacity:1}to{opacity:0}}.one{animation-name:a}.two{animation-name:b}'
    )
  );

  test(
    'should reuse the same animation name for vendor prefixed keyframes',
    processCSS(
      '@-webkit-keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:whiteToBlack;animation-name:whiteToBlack}',
      '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:a;animation-name:a}'
    )
  );

  test(
    'should reuse the same animation name for vendor prefixed keyframes #1',
    processCSS(
      '@-WEBKIT-KEYFRAMES whiteToBlack{0%{color:#fff}to{color:#000}}@KEYFRAMES whiteToBlack{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:whiteToBlack;animation-name:whiteToBlack}',
      '@-WEBKIT-KEYFRAMES a{0%{color:#fff}to{color:#000}}@KEYFRAMES a{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:a;animation-name:a}'
    )
  );

  test(
    'should support multiple animations',
    processCSS(
      '@keyframes one{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes two{0%{border-width:0;opacity:0}}.loader{animation:one  1250ms  infinite linear, two .3s ease-out both}',
      '@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes b{0%{border-width:0;opacity:0}}.loader{animation:a  1250ms  infinite linear, b .3s ease-out both}'
    )
  );

  test(
    'should support multiple animations (uppercase)',
    processCSS(
      '@KEYFRAMES one{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@KEYFRAMES two{0%{border-width:0;opacity:0}}.loader{animation:one  1250ms  infinite linear, two .3s ease-out both}',
      '@KEYFRAMES a{0%{transform:rotate(0deg)}to{transform:rotate(360deg)}}@KEYFRAMES b{0%{border-width:0;opacity:0}}.loader{animation:a  1250ms  infinite linear, b .3s ease-out both}'
    )
  );

  test(
    'should not touch animation names that are not defined in the file',
    passthroughCSS('.one{animation-name:fadeInUp}')
  );

  test(
    'should not touch animation names that are not defined in the file (uppercase)',
    passthroughCSS('.one{ANIMATION-NAME:fadeInUp}')
  );

  test(
    'should not touch keyframes that are not referenced in the file',
    passthroughCSS('@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}')
  );

  test(
    'should not touch keyframes & animation names, combined',
    passthroughCSS(
      '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:fadeInUp}'
    )
  );

  test(
    'should not rename a keyframes name in a property that does not take one',
    processCSS(
      '@keyframes fade{from{opacity:0}}.a{animation-name:fade;animation-timing-function:fade}',
      '@keyframes a{from{opacity:0}}.a{animation-name:a;animation-timing-function:fade}'
    )
  );

  test(
    'should not touch a keyframes name that reads as an animation keyword',
    passthroughCSS(
      '@keyframes linear{from{opacity:0}}.a{animation:linear 2s linear}'
    )
  );

  test(
    'should rename keyframes with extra whitespace in at-rule params',
    processCSS(
      '@keyframes  whiteToBlack  {0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
      '@keyframes  a  {0%{color:#fff}to{color:#000}}.one{animation-name:a}'
    )
  );

  test('should not generate same ident when plugin instance is reused', async () => {
    const instance = postcss(plugin);

    const [result1, result2, result3, result4] = await Promise.all([
      instance.process(
        '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        { from: undefined }
      ),
      instance.process(
        '@KEYFRAMES whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
        { from: undefined }
      ),
      instance.process(
        '@keyframes fadeOut{0%{opacity:1}to{opacity:0}}.two{animation-name:fadeOut}',
        { from: undefined }
      ),
      instance.process(
        '@KEYFRAMES fadeOut{0%{opacity:1}to{opacity:0}}.two{animation-name:fadeOut}',
        { from: undefined }
      ),
    ]);
    assert.strictEqual(
      result1.css,
      '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}'
    );
    assert.strictEqual(
      result2.css,
      '@KEYFRAMES a{0%{color:#fff}to{color:#000}}.one{animation-name:a}'
    );
    assert.strictEqual(
      result3.css,
      '@keyframes b{0%{opacity:1}to{opacity:0}}.two{animation-name:b}'
    );
    assert.strictEqual(
      result4.css,
      '@KEYFRAMES b{0%{opacity:1}to{opacity:0}}.two{animation-name:b}'
    );
  });
});
