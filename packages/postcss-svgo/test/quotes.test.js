import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

const passthroughWithWarning = (css) => async () => {
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 1);
  assert.strictEqual(result.css, css);
};

/**
 * @param {string} css
 * @return {Promise<string>}
 */
async function processBase64Svg(css) {
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.match(result.css, /data:image\/svg\+xml;base64,/v);
  const outputBase64 = result.css.match(
    /data:image\/svg\+xml;base64,([^"'\)]+)/v
  )?.[1];
  assert.ok(outputBase64, 'Expected base64 SVG data URI in output CSS');
  return Buffer.from(outputBase64, 'base64').toString('utf8');
}

const circleBase64 = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="yellow"/></svg>'
).toString('base64');

test('should optimize filter effects with URL fragment without warning', async () => {
  const css =
    'h1{filter:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><filter id="filter"><feGaussianBlur stdDeviation="5" /></filter></svg>#filter\');filter:blur(5px)}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{filter:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"/>#filter\');filter:blur(5px)}'
  );
});

test(
  'should not throw when decoding a svg',
  processCSS(
    "h1{-webkit-mask-box-image: url(\"data:image/svg+xml;charset=utf-8,<svg height='35' viewBox='0 0 96 70' width='48' xmlns='http://www.w3.org/2000/svg'><path d='m84 35c1 7-5 37-42 35-37 2-43-28-42-35-1-7 5-37 42-35 37-2 43 28 42 35z'/></svg>\") 50% 56% 46% 42%;}",
    'h1{-webkit-mask-box-image: url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="35" viewBox="0 0 96 70"><path d="M84 35c1 7-5 37-42 35C5 72-1 42 0 35-1 28 5-2 42 0c37-2 43 28 42 35"/></svg>\') 50% 56% 46% 42%;}'
  )
);

test(
  'should not fail on "malformed" svgs',
  processCSS(
    "h1{background-image:url(\"data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg'><line stroke-width='2' stroke='rgb(255,0,0)' x1='0' y1='100%' x2='100%' y2='0'></line></svg>\")}",
    'h1{background-image:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><line x2="100%" y1="100%" stroke="red" stroke-width="2"/></svg>\')}'
  )
);

test(
  'should encode "malformed" svgs',
  processCSS(
    "h1{background-image:url(\"data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg'><line stroke-width='2' stroke='rgb(255,0,0)' x1='0' y1='100%' x2='100%' y2='0'></line></svg>\")}",
    'h1{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cline%20x2%3D%22100%25%22%20y1%3D%22100%25%22%20stroke%3D%22red%22%20stroke-width%3D%222%22%2F%3E%3C%2Fsvg%3E")}',
    { encode: true }
  )
);

test('should optimize malformed unquoted SVG URLs without warning', async () => {
  const css =
    'h1{background:url(data:image/svg+xml;charset=utf-8,<svg>style type="text/css"><![CDATA[ svg { fill: red; } ]]></style></svg>)}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.notEqual(result.css, css);
});

test('should optimize base64 SVG data URIs containing raw percent characters', async () => {
  const rawSvg =
    '<svg xmlns="http://www.w3.org/2000/svg"><rect width="50%" height="50%"/></svg>';
  const base64 = Buffer.from(rawSvg).toString('base64');
  const css = `h1{background:url("data:image/svg+xml;base64,${base64}")}`;
  const decodedOutput = await processBase64Svg(css);
  assert.match(decodedOutput, /50%/v);
});

test('should optimize base64 SVG data URIs containing %FF without throwing URIError', async () => {
  const rawSvg =
    '<svg xmlns="http://www.w3.org/2000/svg"><text>%FF</text></svg>';
  const base64 = Buffer.from(rawSvg).toString('base64');
  const css = `h1{background:url("data:image/svg+xml;base64,${base64}")}`;
  const decodedOutput = await processBase64Svg(css);
  assert.match(decodedOutput, /%FF/v);
});

test('should optimize base64 SVG data URIs containing %3c without corrupting XML', async () => {
  const rawSvg =
    '<svg xmlns="http://www.w3.org/2000/svg"><text>%3c</text></svg>';
  const base64 = Buffer.from(rawSvg).toString('base64');
  const css = `h1{background:url("data:image/svg+xml;base64,${base64}")}`;
  const decodedOutput = await processBase64Svg(css);
  assert.match(decodedOutput, /%3c/v);
});

test('should optimize unquoted SVG data URIs containing encoded percentages and wrap in quotes', async () => {
  const css =
    'h1{background:url(data:image/svg+xml,%3csvg%20width=%2250%%22%3e%3c/svg%3e)}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2250%25%22%2F%3E")}'
  );
});

test('should optimize base64 data URIs with charset parameter preceding base64', async () => {
  const css = `h1{background:url("data:image/svg+xml;charset=utf-8;base64,${circleBase64}")}`;
  const decodedOutput = await processBase64Svg(css);
  assert.match(decodedOutput, /fill="#ff0"/v);
});

test('should optimize base64 data URIs with quoted charset parameter and whitespace', async () => {
  const css = `h1{background:url('data:image/svg+xml ; charset = "utf-8" ; base64 ,${circleBase64}')}`;
  const decodedOutput = await processBase64Svg(css);
  assert.match(decodedOutput, /fill="#ff0"/v);
});

test('should optimize SVG data URIs with whitespace around parameters', async () => {
  const css =
    "h1{background:url(\"data:image/svg+xml ; charset = utf-8 , <svg xmlns='http://www.w3.org/2000/svg'><circle cx='50' cy='50' r='40' fill='yellow'/></svg>\")}";
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="%23ff0"/></svg>\')}'
  );
});

test('should optimize non-base64 SVG data URIs with URL fragment identifiers', async () => {
  const css =
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="yellow" /><!--comment--></svg>#my-circle\')}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="%23ff0"/></svg>#my-circle\')}'
  );
});

test('should optimize uri-encoded SVG data URIs with URL fragment identifiers', async () => {
  const css =
    'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20fill%3D%22yellow%22%2F%3E%3C%2Fsvg%3E#icon")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20fill%3D%22%23ff0%22%2F%3E%3C%2Fsvg%3E#icon")}'
  );
});

test('should optimize unquoted SVG data URIs containing special characters in hash or parameters', async () => {
  const css =
    'h1{background:url(data:image/svg+xml;charset=utf-8,<svg%20xmlns=%27http://www.w3.org/2000/svg%27><circle%20cx=%2750%27%20cy=%2750%27%20r=%2740%27%20fill=%27yellow%27/></svg>#layer-1_sub.2)}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20fill%3D%22%23ff0%22%2F%3E%3C%2Fsvg%3E#layer-1_sub.2")}'
  );
});

test('should optimize multiple distinct SVG URLs in a single declaration', async () => {
  const css =
    "h1{background:url(\"data:image/svg+xml,<svg><circle cx='5' cy='5' r='5' fill='yellow'/></svg>\"), url(foo.png), url('data:image/svg+xml;utf-8,<svg><rect width=\"10\" height=\"10\" fill=\"yellow\"/></svg>')}";
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg><circle cx="5" cy="5" r="5" fill="%23ff0"/></svg>\'), url(foo.png), url(\'data:image/svg+xml;charset=utf-8,<svg><path fill="%23ff0" d="M0 0h10v10H0z"/></svg>\')}'
  );
});

test('should advance past non-optimizable URLs without redundant traversal', async () => {
  const css =
    'h1{background:url("https://example.com/asset.png?a=1&b=2") url(\'data:image/svg+xml,<svg><circle cx="5" cy="5" r="5" fill="yellow"/></svg>\')}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url("https://example.com/asset.png?a=1&b=2") url(\'data:image/svg+xml;charset=utf-8,<svg><circle cx="5" cy="5" r="5" fill="%23ff0"/></svg>\')}'
  );
});

test('should quote unquoted base64 URLs containing parentheses or whitespace', async () => {
  const rawSvg = '<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>';
  const base64 = Buffer.from(rawSvg).toString('base64');
  const css = `h1{background:url(data:image/svg+xml;base64,${base64}#view\\(0\\,0\\))}`;
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    `h1{background:url("data:image/svg+xml;base64,${base64}#view(0,0)")}`
  );
});

test('should optimize data URIs with single-quoted charset parameter', async () => {
  const css =
    "h1{background:url(\"data:image/svg+xml;charset='utf-8',<svg><circle cx='5' cy='5' r='5' fill='yellow'/></svg>\")}";
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg><circle cx="5" cy="5" r="5" fill="%23ff0"/></svg>\')}'
  );
});

test('should optimize base64 data URIs with single-quoted charset parameter', async () => {
  const css = `h1{background:url("data:image/svg+xml;charset='utf-8';base64,${circleBase64}")}`;
  const decodedOutput = await processBase64Svg(css);
  assert.match(decodedOutput, /fill="#ff0"/v);
});

test('should optimize SVG data URIs with fragment containing greater-than symbol', async () => {
  const css = "h1{background:url('data:image/svg+xml,<svg/>#layer>1')}";
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    "h1{background:url('data:image/svg+xml;charset=utf-8,<svg/>#layer>1')}"
  );
});

test('should optimize SVG data URIs with fragment containing parentheses inside quoted URLs', async () => {
  const css = 'h1{background:url("data:image/svg+xml,<svg/>#view(0,0)")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    "h1{background:url('data:image/svg+xml;charset=utf-8,<svg/>#view(0,0)')}"
  );
});

test('should quote unquoted base64 SVG with single quotes when hash contains double quotes', async () => {
  const css =
    'h1{background:url(data:image/svg+xml;base64,PHN2Zy8+#view\\"test)}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    "h1{background:url('data:image/svg+xml;base64,PHN2Zy8+#view\"test')}"
  );
});

test('should optimize base64 SVG data URIs containing internal newlines or CRLF', async () => {
  const css =
    'h1{background:url("data:image/svg+xml;base64,PHN2\\a Zy8+");filter:url("data:image/svg+xml;base64,PHN2\\d \\a Zy8+")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url("data:image/svg+xml;base64,PHN2Zy8+");filter:url("data:image/svg+xml;base64,PHN2Zy8+")}'
  );
});

test('should handle self-closing SVG without fragment', async () => {
  const css = 'h1{background:url("data:image/svg+xml,<svg/>")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    "h1{background:url('data:image/svg+xml;charset=utf-8,<svg/>')}"
  );
});

test(
  'should pass through SVG without closing tag or self-close',
  passthroughWithWarning('h1{background:url("data:image/svg+xml,<svg")}')
);

test('should optimize self-closing percent-encoded SVG with URL fragment', async () => {
  const css =
    'h1{background:url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27/%3e#icon")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E#icon")}'
  );
});

test('should disambiguate self-closing child element from closing root tag with URL fragment', async () => {
  const css =
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5"/><path d="M0 0h1" fill="%23123456"/></svg>#my-frag\')}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5"/><path fill="%23123456" d="M0 0h1"/></svg>#my-frag\')}'
  );
});
