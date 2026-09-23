import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('Property context gate', () => {
  describe('custom-ident properties passthrough', () => {
    test(
      'should pass through animation-name: white',
      passthroughCSS('h1{animation-name:white}')
    );

    test(
      'should pass through counter-reset: white',
      passthroughCSS('h1{counter-reset:white}')
    );

    test(
      'should pass through container-name: white',
      passthroughCSS('h1{container-name:white}')
    );

    test(
      'should pass through grid-area: yellow',
      passthroughCSS('h1{grid-area:yellow}')
    );

    test(
      'should pass through view-transition-name: white',
      passthroughCSS('h1{view-transition-name:white}')
    );

    test(
      'should pass through scroll-timeline-name: white',
      passthroughCSS('h1{scroll-timeline-name:white}')
    );

    test(
      'should preserve a custom counter style named red',
      passthroughCSS('h1{list-style-type:red}')
    );

    test(
      'should preserve content strings containing color names',
      passthroughCSS('h1{content:"red"}')
    );
  });

  test(
    'should minify vendor prefixed box-shadow colors',
    processCSS(
      'h1{-webkit-box-shadow:0 0 5px white}',
      'h1{-webkit-box-shadow:0 0 5px #fff}'
    )
  );

  test(
    'should minify colors in vendor properties without an unprefixed name',
    processCSS(
      'h1{-webkit-text-fill-color:white}',
      'h1{-webkit-text-fill-color:#fff}'
    )
  );

  test(
    'should minify unprefixed tap-highlight-color for fixture compatibility',
    processCSS(
      'h1{tap-highlight-color:rgba(255,255,255,0)}',
      'h1{tap-highlight-color:hsla(0,0%,100%,0)}'
    )
  );

  describe('shorthands and compound properties minification', () => {
    test(
      'should minify color in background shorthand',
      processCSS('h1{background:yellow}', 'h1{background:#ff0}')
    );

    test(
      'should minify color in border shorthand',
      processCSS('h1{border:1px solid white}', 'h1{border:1px solid #fff}')
    );

    test(
      'should minify color in box-shadow compound property',
      processCSS('h1{box-shadow:0 0 5px white}', 'h1{box-shadow:0 0 5px #fff}')
    );

    test(
      'should minify color in outline shorthand',
      processCSS('h1{outline:1px solid white}', 'h1{outline:1px solid #fff}')
    );
  });
});
