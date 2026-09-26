import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

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

test('should not warn on "escaped-quotes" svgs', async () => {
  const css =
    'h1{background-image:url("data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"400\\" height=\\"400\\" fill-opacity=\\".25\\" ><rect x=\\"200\\" width=\\"200\\" height=\\"200\\" /><rect y=\\"200\\" width=\\"200\\" height=\\"200\\" /></svg>")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
});

test(
  'should not fail on "escaped-quotes" svgs',
  processCSS(
    'h1{background-image:url("data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"400\\" height=\\"400\\" fill-opacity=\\".25\\" ><rect x=\\"200\\" width=\\"200\\" height=\\"200\\" /><rect y=\\"200\\" width=\\"200\\" height=\\"200\\" /></svg>")}',
    'h1{background-image:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill-opacity=".25"><path d="M200 0h200v200H200zM0 200h200v200H0z"/></svg>\')}'
  )
);

test(
  'should encode "unencoded-escaped-quotes" svgs',
  processCSS(
    'h1{background:url("data:image/svg+xml;charset=utf-8,<svg xmlns=\\"http://www.w3.org/2000/svg\\"><circle cx=\\"50\\" cy=\\"50\\" r=\\"40\\" fill=\\"%23ff0\\"/></svg>")}',
    'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20fill%3D%22%23ff0%22%2F%3E%3C%2Fsvg%3E")}',
    { encode: true }
  )
);

test(
  'should decode on "encoded-escaped-quotes" svgs',
  processCSS(
    'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Ccircle cx=\\"50\\" cy=\\"50\\" r=\\"40\\" fill=\\"%23ff0\\"/%3E%3C/svg%3E")}',
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="%23ff0"/></svg>\')}',
    { encode: false }
  )
);

test('should optimize malformed unquoted SVG URLs without warning', async () => {
  const css =
    'h1{background:url(data:image/svg+xml;charset=utf-8,<svg>style type="text/css"><![CDATA[ svg { fill: red; } ]]></style></svg>)}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.notEqual(result.css, css);
});

test('should recognize escaped url function names and decode quoted payloads', async () => {
  const result = await postcss(plugin()).process(
    'h1{background:u\\72l("data:image/svg+xml,\\3c svg\\3e \\3c circle/\\3e \\3c/svg\\3e ")}',
    { from: undefined }
  );
  assert.equal(
    result.css,
    "h1{background:u\\72l('data:image/svg+xml;charset=utf-8,<svg><circle/></svg>')}"
  );
});

test('should escape decoded quotes and backslashes in optimized URLs', async () => {
  const css = String.raw`h1{background:url("data:image/svg+xml,<svg><path aria-label=\"it's\\value\" d=\"M0 0h1\"/></svg>")}`;
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.equal(
    result.css,
    String.raw`h1{background:url('data:image/svg+xml;charset=utf-8,<svg><path d="M0 0h1" aria-label="it\'s\\value"/></svg>')}`
  );
});

test('should optimize SVG data URIs with mixed percent-encoded characters and raw percent signs', async () => {
  const css = `:root
{
  --var-1: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' style='background: rgb(0 0 0 / 80%);' ></svg>");
  --var-2: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' style='background: rgb(0 0 0 / 80%);' ></svg>");
  --var-3: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' style='background: rgb(0 0 0 / 80%25);' ></svg>");
}`;

  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  const matchVar2 = result.css.match(/--var-2:\s*url\(([^\)]+)\)/v)?.[1];
  const matchVar3 = result.css.match(/--var-3:\s*url\(([^\)]+)\)/v)?.[1];
  assert.ok(matchVar2);
  assert.strictEqual(matchVar2, matchVar3);
});

test('should emit URIError warning and pass through when data URI has invalid percent-encoded UTF-8 bytes', async () => {
  const css = 'h1{background:url("data:image/svg+xml,%FF")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.css, css);
  assert.strictEqual(result.messages.length, 1);
  assert.strictEqual(result.messages[0].type, 'warning');
  assert.match(result.messages[0].text, /URIError/v);
  assert.doesNotMatch(result.messages[0].text, /SvgoParserError/v);
});

test('should optimize SVG data URIs with astral plane Unicode characters', async () => {
  const css =
    'h1{background:url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27%3e%3ctext%3e%F0%9F%9A%80%3c/text%3e%3c/svg%3e")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.match(result.css, /%F0%9F%9A%80/v);

  // When encode is false, astral character should be output decoded directly
  const unencodedResult = await postcss(plugin({ encode: false })).process(
    css,
    { from: undefined }
  );
  assert.strictEqual(unencodedResult.messages.length, 0);
  assert.match(unencodedResult.css, /🚀/v);
});

test('should retain unencoded literal percent in style when encode option is false', async () => {
  const css =
    "h1{background:url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' style='opacity: 80%;'%3e%3c/svg%3e\")}";
  const result = await postcss(plugin({ encode: false })).process(css, {
    from: undefined,
  });
  assert.strictEqual(result.messages.length, 0);
  assert.match(result.css, /80%/v);
  assert.doesNotMatch(result.css, /80%25/v);
});

test('should optimize base64 SVG data URIs containing raw percent characters', async () => {
  const rawSvg =
    '<svg xmlns="http://www.w3.org/2000/svg"><rect width="50%" height="50%"/></svg>';
  const base64 = Buffer.from(rawSvg).toString('base64');
  const css = `h1{background:url("data:image/svg+xml;base64,${base64}")}`;
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.match(result.css, /data:image\/svg\+xml;base64,/v);
  const outputBase64 = result.css.match(
    /data:image\/svg\+xml;base64,([^"'\)]+)/v
  )?.[1];
  assert.ok(outputBase64);
  const decodedOutput = Buffer.from(outputBase64, 'base64').toString('utf8');
  assert.match(decodedOutput, /50%/v);
});

test('should optimize base64 SVG data URIs containing %FF without throwing URIError', async () => {
  const rawSvg =
    '<svg xmlns="http://www.w3.org/2000/svg"><text>%FF</text></svg>';
  const base64 = Buffer.from(rawSvg).toString('base64');
  const css = `h1{background:url("data:image/svg+xml;base64,${base64}")}`;
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  const outputBase64 = result.css.match(
    /data:image\/svg\+xml;base64,([^"'\)]+)/v
  )?.[1];
  assert.ok(outputBase64);
  const decodedOutput = Buffer.from(outputBase64, 'base64').toString('utf8');
  assert.match(decodedOutput, /%FF/v);
});

test('should optimize base64 SVG data URIs containing %3c without corrupting XML', async () => {
  const rawSvg =
    '<svg xmlns="http://www.w3.org/2000/svg"><text>%3c</text></svg>';
  const base64 = Buffer.from(rawSvg).toString('base64');
  const css = `h1{background:url("data:image/svg+xml;base64,${base64}")}`;
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  const outputBase64 = result.css.match(
    /data:image\/svg\+xml;base64,([^"'\)]+)/v
  )?.[1];
  assert.ok(outputBase64);
  const decodedOutput = Buffer.from(outputBase64, 'base64').toString('utf8');
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

test('should optimize unencoded SVG data URIs containing literal percent characters before non-hex text', async () => {
  const css =
    'h1{background:url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\'><text>100% discount</text></svg>")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><text>100% discount</text></svg>\')}'
  );
});

test('should optimize base64 data URIs with charset parameter preceding base64', async () => {
  const rawSvg =
    '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="yellow"/></svg>';
  const base64 = Buffer.from(rawSvg).toString('base64');
  const css = `h1{background:url("data:image/svg+xml;charset=utf-8;base64,${base64}")}`;
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.match(result.css, /data:image\/svg\+xml;base64,/v);
  const outputBase64 = result.css.match(
    /data:image\/svg\+xml;base64,([^"'\)]+)/v
  )?.[1];
  assert.ok(outputBase64);
  const decodedOutput = Buffer.from(outputBase64, 'base64').toString('utf8');
  assert.match(decodedOutput, /fill="#ff0"/v);
});

test('should optimize base64 data URIs with quoted charset parameter and whitespace', async () => {
  const rawSvg =
    '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="yellow"/></svg>';
  const base64 = Buffer.from(rawSvg).toString('base64');
  const css = `h1{background:url('data:image/svg+xml ; charset = "utf-8" ; base64 ,${base64}')}`;
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.match(result.css, /data:image\/svg\+xml;base64,/v);
  const outputBase64 = result.css.match(
    /data:image\/svg\+xml;base64,([^"'\)]+)/v
  )?.[1];
  assert.ok(outputBase64);
  const decodedOutput = Buffer.from(outputBase64, 'base64').toString('utf8');
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

test('should escape newlines in unencoded SVG string tokens', async () => {
  const cssFromEscapes =
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><text>hello\\a world</text></svg>\')}';
  const result1 = await postcss(plugin({ encode: false })).process(
    cssFromEscapes,
    { from: undefined }
  );
  assert.strictEqual(result1.messages.length, 0);
  assert.doesNotMatch(result1.css, /[\r\n\f]/v);
  assert.match(result1.css, /hello\\a world/v);

  const cssFromEncoded =
    'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ctext%3Ehello%0Aworld%0D%0Afoo%0Dbar%0Cbaz%3C%2Ftext%3E%3C%2Fsvg%3E")}';
  const result2 = await postcss(plugin({ encode: false })).process(
    cssFromEncoded,
    { from: undefined }
  );
  assert.strictEqual(result2.messages.length, 0);
  assert.doesNotMatch(result2.css, /[\r\n\f]/v);
  assert.match(result2.css, /hello\\a world\\a foo\\a bar\\c baz/v);

  const cssPretty =
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5"/></svg>\')}';
  const result3 = await postcss(
    plugin({ encode: false, js2svg: { pretty: true } })
  ).process(cssPretty, { from: undefined });
  assert.strictEqual(result3.messages.length, 0);
  assert.doesNotMatch(result3.css, /[\r\n\f]/v);
  assert.match(result3.css, /\\a /v);
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
  const rawSvg =
    '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="yellow"/></svg>';
  const base64 = Buffer.from(rawSvg).toString('base64');
  const css = `h1{background:url("data:image/svg+xml;charset='utf-8';base64,${base64}")}`;
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.match(result.css, /data:image\/svg\+xml;base64,/v);
  const outputBase64 = result.css.match(
    /data:image\/svg\+xml;base64,([^"'\)]+)/v
  )?.[1];
  assert.ok(outputBase64);
  const decodedOutput = Buffer.from(outputBase64, 'base64').toString('utf8');
  assert.match(decodedOutput, /fill="#ff0"/v);
});

test('should optimize SVG data URIs containing CSS backslash escapes in delimiters', async () => {
  const css =
    "h1{background:url(\"data:image\\/svg\\+xml,<svg><circle cx='5' cy='5' r='5'/></svg>\")}";
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg><circle cx="5" cy="5" r="5"/></svg>\')}'
  );
});

test('should optimize unquoted base64 SVG data URIs containing CSS backslash escapes in delimiters', async () => {
  const css =
    'h1{background:url(data:image\\/svg\\+xml;base64,PHN2Zz48L3N2Zz4=)}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url(data:image/svg+xml;base64,PHN2Zy8+)}'
  );
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

test('should optimize data URIs whose letters are written as CSS hex escapes', async () => {
  const result = await postcss(plugin()).process(
    'h1{background:url("d\\61ta:image/svg+xml,<svg fill=\'red\'/>")}',
    { from: undefined }
  );
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg fill="red"/>\')}'
  );
});

test('should escape special characters in double-quoted URLs', async () => {
  const css =
    'h1{background:url("data:image/svg+xml;base64,PHN2Zy8+#test\\a test\\c test\\\\test\\"test")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.match(result.css, /\\a /v);
  assert.match(result.css, /\\c /v);
  assert.match(result.css, /\\\\/v);
  assert.match(result.css, /\\"/v);
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

test('should pass through SVG without closing tag or self-close', async () => {
  const css = 'h1{background:url("data:image/svg+xml,<svg")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 1);
  assert.strictEqual(result.css, css);
});

test('should pass through percent-encoded SVG containing raw hash in attributes', async () => {
  const css =
    'h1{background:url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27%3e%3ccircle fill=%22#ff0%22/%3e%3c/svg%3e")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 1);
  assert.strictEqual(result.css, css);
});

test('should optimize percent-encoded SVG containing percent-encoded hash in attributes', async () => {
  const css =
    'h1{background:url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27%3e%3ccircle fill=%22%23ff0%22/%3e%3c/svg%3e")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20fill%3D%22%23ff0%22%2F%3E%3C%2Fsvg%3E")}'
  );
});

test('should pass through percent-encoded SVG with internal raw hash and trailing URL fragment', async () => {
  const css =
    'h1{background:url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27%3e%3ccircle fill=%22#ff0%22/%3e%3c/svg%3e#frag")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 1);
  assert.strictEqual(result.css, css);
});

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

test('should wrap unquoted URL containing backslash in quotes', async () => {
  const css = String.raw`h1{background:url(data:image/svg+xml;base64,PHN2Zy8+#foo\\bar)}`;
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    String.raw`h1{background:url("data:image/svg+xml;base64,PHN2Zy8+#foo\\bar")}`
  );
});
