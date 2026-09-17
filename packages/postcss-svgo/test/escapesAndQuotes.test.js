import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should not mangle filter effects',
  passthroughCSS(
    'h1{filter:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><filter id="filter"><feGaussianBlur stdDeviation="5" /></filter></svg>#filter\');filter:blur(5px)}'
  )
);

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
    'h1{background:url("data:image/svg+xml;charset=utf-8,<svg xmlns=\\"http://www.w3.org/2000/svg\\"><circle cx=\\"50\\" cy=\\"50\\" r=\\"40\\" fill=\\"#ff0\\"/></svg>")}',
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
