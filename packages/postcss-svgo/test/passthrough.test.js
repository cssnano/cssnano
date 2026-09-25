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
    'should skip invalid non-SVG payload with fragment',
    processCSS(
      'h1{background-image:url("data:image/svg+xml;charset=utf-8,foo#bar")}',
      'h1{background-image:url("data:image/svg+xml;charset=utf-8,foo#bar")}'
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
    passthroughCSS(
      'h1{background-image:url("data:image/svg+xml;charset=iso-8859-1,<svg><circle/></svg>")}'
    )
  );

  test(
    'should skip when data URI contains US-ASCII charset',
    passthroughCSS(
      'h1{background-image:url("data:image/svg+xml;charset=US-ASCII,<svg><circle/></svg>")}'
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

test('should pass through SVG-like URLs without a data scheme', async () => {
  const css = 'h1{background:url(xdata:image/svg+xml,<svg/>)}';
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

test('should process URL containing comments', async () => {
  const css =
    "h1{background:url(\"data:image/svg+xml,<svg><circle cx='5' cy='5' r='5' fill='yellow'/></svg>\" /* trailing comment */)}";
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg><circle cx="5" cy="5" r="5" fill="%23ff0"/></svg>\' /* trailing comment */)}'
  );
});

test(
  'should pass through empty url() and url("")',
  passthroughCSS('h1{background:url() url("") url(\'\')}')
);

test(
  'should pass through url with multiple or non-string arguments',
  passthroughCSS('h1{background:url(a b);mask:url(data:image/svg+xml foo bar)}')
);

test('should handle programmatic declaration with unbalanced tokens', async () => {
  const root = postcss.parse('h1{background:none;}');
  // @ts-ignore
  root.first.first.value = 'url("data:image/svg+xml,<svg/>"';
  const result = await postcss([plugin()]).process(root, { from: undefined });
  assert.strictEqual(
    result.css,
    'h1{background:url("data:image/svg+xml,<svg/>";}'
  );
});

test(
  'should optimize data URI in url() with CSS Values 4 url-modifiers and preserve modifiers',
  processCSS(
    "h1{background:url(\"data:image/svg+xml,<svg><circle cx='5' cy='5' r='5' fill='yellow'/></svg>\" format(\"image/svg+xml\"))}",
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg><circle cx="5" cy="5" r="5" fill="%23ff0"/></svg>\' format("image/svg+xml"))}'
  )
);

test(
  'should optimize data URI in modern src() function with url-modifiers',
  processCSS(
    "@font-face{src:src(\"data:image/svg+xml,<svg><circle cx='5' cy='5' r='5' fill='yellow'/></svg>\" format(\"image/svg+xml\"))}",
    '@font-face{src:src(\'data:image/svg+xml;charset=utf-8,<svg><circle cx="5" cy="5" r="5" fill="%23ff0"/></svg>\' format("image/svg+xml"))}'
  )
);

test(
  'should preserve leading and trailing comments inside src() function',
  processCSS(
    "@font-face{src:src(/* leading */ \"data:image/svg+xml,<svg><circle cx='5' cy='5' r='5' fill='yellow'/></svg>\" /* trailing */)}",
    '@font-face{src:src(/* leading */ \'data:image/svg+xml;charset=utf-8,<svg><circle cx="5" cy="5" r="5" fill="%23ff0"/></svg>\' /* trailing */)}'
  )
);

test(
  'should pass through data URI with extra RFC 2397 parameters before the comma',
  passthroughCSS(
    'h1{background:url("data:image/svg+xml;id=foo,<svg><circle fill=\'red\'/></svg>")}'
  )
);

test(
  'should pass through non-string arguments such as numbers in url()',
  processCSS(
    'h1{background:url(123) url() src(123) src() src(/* empty */) url("data:image/svg+xml,<svg><circle fill=\'red\'/></svg>")}',
    'h1{background:url(123) url() src(123) src() src(/* empty */) url(\'data:image/svg+xml;charset=utf-8,<svg><circle fill="red"/></svg>\')}'
  )
);

test(
  'should quote and escape unquoted base64 data URI when URL fragment contains single and double quotes',
  processCSS(
    'h1{background:url(data:image/svg+xml;base64,PHN2Zy8+#view\\\'test\\"both)}',
    "h1{background:url('data:image/svg+xml;base64,PHN2Zy8+#view\\'test\"both')}"
  )
);

test(
  'should pass through non-conforming payload with invalid XML percent escape',
  passthroughCSS('h1{background:url("data:image/svg+xml,%zz")}')
);

test(
  'should pass through non-conforming payload with truncated percent escape',
  passthroughCSS('h1{background:url("data:image/svg+xml,%")}')
);

test(
  'should pass through when unencoded hash in markup truncates XML per WHATWG URL standards',
  passthroughCSS(
    'h1{background:url("data:image/svg+xml,<svg fill=\'#ff0\'/>#frag")}'
  )
);

test(
  'should optimize clean unencoded SVG without hash per WHATWG URL standards',
  processCSS(
    'h1{background:url("data:image/svg+xml,<svg><circle fill=\'red\'/></svg>")}',
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg><circle fill="red"/></svg>\')}'
  )
);

test(
  'should optimize SVG with percent-encoded hash in markup and reattach fragment per WHATWG URL standards',
  processCSS(
    'h1{background:url("data:image/svg+xml,<svg><circle fill=\'%23ff0\'/></svg>#icon")}',
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg><circle fill="%23ff0"/></svg>#icon\')}'
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
