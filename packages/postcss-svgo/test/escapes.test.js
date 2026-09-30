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

test(
  'should pass through percent-encoded SVG containing raw hash in attributes',
  passthroughWithWarning(
    'h1{background:url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27%3e%3ccircle fill=%22#ff0%22/%3e%3c/svg%3e")}'
  )
);

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

test(
  'should pass through percent-encoded SVG with internal raw hash and trailing URL fragment',
  passthroughWithWarning(
    'h1{background:url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27%3e%3ccircle fill=%22#ff0%22/%3e%3c/svg%3e#frag")}'
  )
);

test('should wrap unquoted URL containing backslash in quotes', async () => {
  const css = String.raw`h1{background:url(data:image/svg+xml;base64,PHN2Zy8+#foo\\bar)}`;
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.strictEqual(result.messages.length, 0);
  assert.strictEqual(
    result.css,
    String.raw`h1{background:url("data:image/svg+xml;base64,PHN2Zy8+#foo\\bar")}`
  );
});
