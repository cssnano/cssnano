import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Skip', () => {
  test(
    'should skip invalid svg',
    processCSS(
      'h1{background-image:url("data:image/svg+xml;charset=utf-8,foo")}',
      'h1{background-image:url("data:image/svg+xml;charset=utf-8,foo")}'
    )
  );

  test(
    'should skip invalid svg in base64',
    processCSS(
      'h1{background-image:url("data:image/svg+xml;base64,foo")}',
      'h1{background-image:url("data:image/svg+xml;base64,foo")}'
    )
  );

  test(
    'should skip when data URI contain invalid media type',
    processCSS(
      'h1{background-image:url("data:image/svg;charset=utf-8,foo")}',
      'h1{background-image:url("data:image/svg;charset=utf-8,foo")}'
    )
  );

  test(
    'should skip when data URI contain charset is not in `utf-8`',
    processCSS(
      'h1{background-image:url("data:image/svg;charset=US-ASCII,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>")}',
      'h1{background-image:url("data:image/svg;charset=US-ASCII,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" />\\3c !--test comment--></svg>")}'
    )
  );
});

test('should only warn with svg data uri', async () => {
  const css = `@font-face {
  src: url("https://example/dfds.woff2") format("woff2"),
       url('data:image/svg+xml;charset=utf-8,<svg></svg>') format("svg");
  }`;
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
});

test(
  'should pass through links to svg files',
  passthroughCSS('h1{background:url(unicorn.svg)}')
);

test(
  'should pass through opaque and malformed non-data URL tokens',
  passthroughCSS('h1{background:url(foo\\ bar.svg);mask-image:url(foo(})}')
);

test(
  'should skip non-SVG urls',
  passthroughCSS(`@font-face {
  src: url("../example/dfds.woff2") format("woff2"),
       url('data:image/svg+xml;charset=utf-8,<svg/>') format("svg");
  }`)
);

test('should continue after a non-data URL', async () => {
  const result = await postcss(plugin()).process(
    'h1{background:url(foo.svg) url("data:image/svg+xml,<svg><circle/></svg>")}',
    { from: undefined }
  );
  assert.match(result.css, /data:image\/svg\+xml;charset=utf-8/v);
  assert.match(result.css, /url\('data:image\/svg\+xml;charset=utf-8/v);
});

test('should continue after an invalid base64 SVG data URI', async () => {
  const result = await postcss(plugin()).process(
    'h1{background:url("data:image/svg+xml;base64,foo") url("data:image/svg+xml,<svg><circle/></svg>")}',
    { from: undefined }
  );
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].type, 'warning');
  assert.equal(
    result.css,
    'h1{background:url("data:image/svg+xml;base64,foo") url(\'data:image/svg+xml;charset=utf-8,<svg><circle/></svg>\')}'
  );
});

test('should pass through data-looking bad URLs byte-for-byte', async () => {
  const css = 'h1{background:url(data:image/svg+xml,<svg>)}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.equal(result.css, css);
});

test('should process nested URL functions', async () => {
  const nested =
    'h1{background:var(--image, url("data:image/svg+xml,<svg><circle/></svg>"))}';
  const result = await postcss(plugin()).process(nested, { from: undefined });
  assert.equal(
    result.css,
    "h1{background:var(--image, url('data:image/svg+xml;charset=utf-8,<svg><circle/></svg>'))}"
  );
});

test('should optimize a valid SVG URL next to an opaque URL', async () => {
  const result = await postcss(plugin()).process(
    'h1{background:url(foo\\ bar.svg) url("data:image/svg+xml,<svg><circle/></svg>")}',
    { from: undefined }
  );
  assert.equal(
    result.css,
    "h1{background:url(foo\\ bar.svg) url('data:image/svg+xml;charset=utf-8,<svg><circle/></svg>')}"
  );
});

test('should optimize consecutive SVG URLs without whitespace', async () => {
  const base64Input =
    'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZS8+PC9zdmc+';
  const base64Expected =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUvPjwvc3ZnPg==';
  const result = await postcss(plugin()).process(
    `h1{background:url(${base64Input})url("${base64Input}")}`,
    { from: undefined }
  );
  assert.equal(
    result.css,
    `h1{background:url(${base64Expected})url("${base64Expected}")}`
  );
});

test('should optimize consecutive unquoted SVG URLs without whitespace', async () => {
  const base64Input =
    'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZS8+PC9zdmc+';
  const base64Expected =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUvPjwvc3ZnPg==';
  const result = await postcss(plugin()).process(
    `h1{background:url(${base64Input})url(${base64Input})}`,
    { from: undefined }
  );
  assert.equal(
    result.css,
    `h1{background:url(${base64Expected})url(${base64Expected})}`
  );
});

describe('Pass', () => {
  test(
    'should pass through relative links to svg files',
    passthroughCSS('h1{background:url(../unicorn.svg#part)}')
  );

  test(
    'should pass through URLs with SVG in parameters',
    passthroughCSS('h1{background:url(something.php?image=decor.svg)}')
  );
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
