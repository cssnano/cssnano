import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('Animations and font-face', () => {
  test(
    'should not try to convert keyframe names in animation',
    passthroughCSS(
      'h1{ -webkit-animation: e836684w2 } h2{ animation: e836684w2 }'
    )
  );

  test(
    'should not try to convert keyframe names in animation (case 2)',
    passthroughCSS(`
.e4yw0Q {
    animation: e4yw0Q;
}

@keyframes e4yw0Q {}
    `)
  );

  for (const property of [
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-width',
  ]) {
    test(
      `should not strip the percentage from 0 in SVG animation, for IE (${property})`,
      passthroughCSS(`@keyframes a{0%{${property}:200%}to{${property}:0%}}`)
    );
  }

  for (const property of [
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-width',
  ]) {
    test(
      `should not strip percentage from 0 in SVG transitions outside keyframes (${property})`,
      passthroughCSS(`.bar{${property}:0%;transition:${property} 1s}`)
    );
  }

  for (const property of [
    'STROKE-DASHARRAY',
    'STROKE-DASHOFFSET',
    'STROKE-WIDTH',
  ]) {
    test(
      `should not strip the percentage from 0 in SVG animation, for IE (${property}) (2)`,
      passthroughCSS(`@KEYFRAMES a{0%{${property}:200%}to{${property}:0%}}`)
    );
  }

  test(
    'should not convert ascent and descent-override',
    passthroughCSS(
      '@font-face {descent-override:0%;ascent-override:0%;line-gap-override:0%;size-adjust:0%;font-stretch:0%}'
    )
  );

  test(
    'should not convert CSS Fonts 5 override descriptors zero percentages',
    passthroughCSS(
      '@font-face {subscript-position-override:0%;superscript-position-override:0%;subscript-size-override:0%;superscript-size-override:0%}'
    )
  );

  test(
    'should not convert text-size-adjust and font-width zero percentages',
    passthroughCSS(
      '@font-face {font-width:0%} html{text-size-adjust:0%;-webkit-text-size-adjust:0%;-moz-text-size-adjust:0%;-ms-text-size-adjust:0%}'
    )
  );

  test(
    'should simplify non-zero percentages in override descriptors and text-size-adjust',
    processCSS(
      '@font-face {size-adjust:100.0%;font-width:100.0%;descent-override:80.0%;subscript-position-override:50.0%} html{text-size-adjust:100.0%}',
      '@font-face {size-adjust:100%;font-width:100%;descent-override:80%;subscript-position-override:50%} html{text-size-adjust:100%}'
    )
  );

  test(
    'should not convert unicode-range descriptor in @font-face',
    passthroughCSS(
      '@font-face{font-family:test;src:url(test.woff2);unicode-range:U+0100-017F}'
    )
  );

  test(
    'should not convert unicode-range descriptor with wildcards in @font-face',
    passthroughCSS(
      '@font-face{font-family:test;src:url(test.woff2);unicode-range:U+4??}'
    )
  );

  test(
    'should not convert comma-separated unicode ranges in @font-face',
    passthroughCSS(
      '@font-face{font-family:test;unicode-range:U+0025-00FF,U+4??}'
    )
  );

  test(
    'should not convert vendor-prefixed unicode-range descriptor in @font-face',
    passthroughCSS(
      '@font-face{font-family:test;-webkit-unicode-range:U+0100-017F}'
    )
  );

  test(
    'should preserve unicode-range in custom properties when transformCustomProperties is true',
    passthroughCSS(':root{--my-range:U+0100-017F,U+4??}', {
      transformCustomProperties: true,
    })
  );

  test(
    'should strip length zero from border-image-width inside keyframes',
    processCSS(
      '@keyframes test {0% {border-image-width: 0px 0px 100% 0%;}}',
      '@keyframes test {0% {border-image-width: 0 0 100% 0%;}}'
    )
  );

  test(
    'should preserve keyframe zero percentages under CSS nesting',
    passthroughCSS(
      '@keyframes spin { from { & { stroke-dasharray: 0%; stroke-dashoffset: 0%; stroke-width: 0%; } } }'
    )
  );

  test(
    'should preserve keyframe zero percentages under deep CSS nesting',
    passthroughCSS(
      '@keyframes spin { from { & { div { stroke-dasharray: 0%; } } } }'
    )
  );

  test(
    'should preserve keyframe zero percentages under nested @supports',
    passthroughCSS(
      '@keyframes spin { from { @supports (display: flex) { stroke-dasharray: 0%; stroke-dashoffset: 0%; stroke-width: 0%; border-image-width: 0%; } } }'
    )
  );

  test(
    'should preserve keyframe zero percentages under nested @media',
    passthroughCSS(
      '@keyframes spin { from { @media (min-width: 0px) { stroke-dasharray: 0%; } } }'
    )
  );

  test(
    'should preserve keyframe zero percentages under nested @layer',
    passthroughCSS(
      '@keyframes spin { from { @layer base { stroke-dasharray: 0%; } } }'
    )
  );

  test(
    'should preserve keyframe zero percentages under nested @scope',
    passthroughCSS(
      '@keyframes spin { from { @scope (.foo) { stroke-dasharray: 0%; } } }'
    )
  );

  test(
    'should not clamp opacity greater than 1 inside keyframes',
    passthroughCSS('@keyframes bounce { 50% { opacity: 1.2; } }')
  );

  test(
    'should not clamp opacity less than 0 inside keyframes',
    processCSS(
      '@keyframes bounce { 50% { opacity: -0.2; } }',
      '@keyframes bounce { 50% { opacity: -.2; } }'
    )
  );

  test(
    'should not clamp fill-opacity greater than 1 inside keyframes',
    passthroughCSS('@keyframes bounce { 50% { fill-opacity: 1.5; } }')
  );

  test(
    'should not clamp opacity in nested keyframes under CSS nesting and @supports',
    passthroughCSS(
      '@keyframes bounce { from { @supports (display: flex) { opacity: 1.2; } } }'
    )
  );

  test(
    'should not clamp opacity in @-webkit-keyframes',
    passthroughCSS('@-webkit-keyframes bounce { 50% { opacity: 1.2; } }')
  );
});
