import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS, processor } = processCSSFactory(plugin);

describe('Fragment extraction', () => {
  test(
    'should reattach a fragment placed after the root close tag',
    processCSS(
      'h1{background:url("data:image/svg+xml,<svg><circle fill=\'red\'/></svg>#frag")}',
      'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg><circle fill="red"/></svg>#frag\')}'
    )
  );

  test(
    'should reattach a fragment placed after a self-closing root tag',
    processCSS(
      'h1{background:url("data:image/svg+xml,<svg viewBox=\'0 0 2 2\'/>#frag")}',
      'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg viewBox="0 0 2 2"/>#frag\')}'
    )
  );

  test(
    'should reattach a fragment placed after an empty self-closing root tag',
    processCSS(
      'h1{background:url("data:image/svg+xml,<svg/>#frag")}',
      "h1{background:url('data:image/svg+xml;charset=utf-8,<svg/>#frag')}"
    )
  );

  test(
    'should reattach a literal fragment after a percent-encoded root close tag',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3Csvg%3E%3Ccircle/%3E%3C/svg%3E#frag")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%3E%3Ccircle%2F%3E%3C%2Fsvg%3E#frag")}'
    )
  );

  test(
    'should reattach a literal fragment after a percent-encoded self-closing root tag',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3Csvg/%3E#frag")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E#frag")}'
    )
  );

  test(
    'should optimise an svg preceded by an XML comment and reattach the fragment',
    processCSS(
      'h1{background:url("data:image/svg+xml,<!-- c --><svg><circle/></svg>#frag")}',
      "h1{background:url('data:image/svg+xml;charset=utf-8,<svg><circle/></svg>#frag')}"
    )
  );

  test(
    'should use the real root close tag when a CDATA section contains a closing tag',
    processCSS(
      'h1{background:url("data:image/svg+xml,<svg><style><![CDATA[ </svg> ]]></style></svg>#frag")}',
      "h1{background:url('data:image/svg+xml;charset=utf-8,<svg/>#frag')}"
    )
  );

  test(
    'should treat everything after the first fragment delimiter as the fragment',
    processCSS(
      'h1{background:url("data:image/svg+xml,<svg><circle/></svg>#a<b>")}',
      "h1{background:url('data:image/svg+xml;charset=utf-8,<svg><circle/></svg>#a<b>')}"
    )
  );
});

describe('Markup delimiters hidden from tag scanning', () => {
  // A greater-than sign inside an attribute value must not end the tag: the
  // root close boundary is found quote-aware, so the '#' of fill='#ff0' stays
  // inside the document instead of being mistaken for a URL fragment.
  test(
    'should keep an SVG whose attribute value contains a greater-than sign',
    processCSS(
      "h1 { background: url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' data-info='a > b' fill='#ff0'/>\") }",
      'h1 { background: url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" fill="%23ff0" data-info="a &gt; b"/>\') }'
    )
  );

  test(
    'should keep an SVG whose attribute value contains a self-close sequence',
    processCSS(
      "h1 { background: url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' aria-label='a/>b' fill='#ff0'/>\") }",
      'h1 { background: url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" fill="%23ff0" aria-label="a/&gt;b"/>\') }'
    )
  );

  test(
    'should not mistake a close tag inside a leading comment for the root close',
    processCSS(
      'h1 { background: url("data:image/svg+xml,<!-- </svg> --><svg fill=\'#ff0\'/>") }',
      'h1 { background: url(\'data:image/svg+xml;charset=utf-8,<svg fill="%23ff0"/>\') }'
    )
  );

  test(
    'should keep an SVG whose hash attribute follows a leading comment',
    processCSS(
      "h1 { background: url(\"data:image/svg+xml,<!-- </svg> --><svg id='icon' fill='#ff0'/>\") }",
      'h1 { background: url(\'data:image/svg+xml;charset=utf-8,<svg id="icon" fill="%23ff0"/>\') }'
    )
  );
});

describe('Prolog handling before the root element', () => {
  test(
    'should reattach a fragment after an XML declaration and DOCTYPE',
    processCSS(
      "h1{background:url(\"data:image/svg+xml,<?xml version='1.0'?><!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'><svg fill='#ff0'/>#frag\")}",
      'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg fill="%23ff0"/>#frag\')}'
    )
  );

  test(
    'should reattach a fragment after a percent-encoded XML declaration',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%3F%3E%3Csvg%3E%3Ccircle%20fill%3D%22#ff0%22%2F%3E%3C%2Fsvg%3E#frag")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%3E%3Ccircle%20fill%3D%22%23ff0%22%2F%3E%3C%2Fsvg%3E#frag")}'
    )
  );

  test(
    'should reattach a fragment after a percent-encoded DOCTYPE',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3C%21DOCTYPE%20svg%20PUBLIC%20%22-//W3C//DTD%20SVG%201.1//EN%22%3E%3Csvg%3E%3Ccircle%20fill%3D%22#ff0%22%2F%3E%3C%2Fsvg%3E#frag")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%3E%3Ccircle%20fill%3D%22%23ff0%22%2F%3E%3C%2Fsvg%3E#frag")}'
    )
  );

  test(
    'should skip whitespace and comments between prolog constructs',
    processCSS(
      "h1{background:url(\"data:image/svg+xml, <!-- c --> <?xml version='1.0'?> <!-- d --> <svg fill='#ff0'/>#frag\")}",
      'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg fill="%23ff0"/>#frag\')}'
    )
  );
});

describe('Pathological payload resilience', () => {
  // Repeated XML comments followed by an unclosed root tag previously sent
  // fragment extraction into exponential backtracking. The payload below took
  // multiple seconds; linear extraction finishes in single-digit milliseconds,
  // leaving a wide margin for slow CI runners. The comments are
  // percent-encoded so the pass-through expectation is not perturbed by
  // PostCSS reserializing literal '<!--' inside strings.
  test('should stay linear on many XML comments with an unclosed root tag', async () => {
    const payload =
      '%3c!-- comment --%3e'.repeat(25) + '<svg><circle/>' + '#frag';
    const css = `h1{background:url("data:image/svg+xml,${payload}")}`;

    const start = performance.now();
    const result = await processor(css);
    const elapsed = performance.now() - start;

    assert.ok(
      elapsed < 1000,
      `took ${elapsed.toFixed(0)}ms, expected linear time`
    );
    assert.strictEqual(result.css, css);
    assert.ok(result.warnings().length > 0);
  });

  // Locating the last root close tag previously rescanned the remainder of the
  // payload per candidate (quadratic). The stray close tags make svgo abort
  // immediately, so the remaining cost isolates fragment extraction, which
  // took ~400ms; linear extraction keeps it in single-digit milliseconds.
  test('should stay linear on many root close tags', async () => {
    const payload = '<svg><circle/>' + '</svg>'.repeat(4000) + '#frag';
    const css = `h1{background:url("data:image/svg+xml,${payload}")}`;

    const start = performance.now();
    const result = await processor(css);
    const elapsed = performance.now() - start;

    assert.ok(
      elapsed < 300,
      `took ${elapsed.toFixed(0)}ms, expected linear time`
    );
    assert.strictEqual(result.css, css);
    assert.ok(result.warnings().length > 0);
  });

  test(
    'should pass through an unclosed root tag with a fragment unchanged',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,<svg><circle fill=\'red\'/>#frag")}'
    )
  );
});

describe('Malformed and unterminated payload structure', () => {
  test(
    'should pass through a payload ending in an unterminated close tag',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,<svg><circle/></svg")}'
    )
  );

  test(
    'should pass through a payload ending in an unterminated non-svg close tag',
    passthroughCSS('h1{background:url("data:image/svg+xml,<svg><circle/></g")}')
  );

  test(
    'should pass through a payload ending in an unterminated open tag',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,<svg><circle fill=\'red\'")}'
    )
  );

  test(
    'should minify a payload with lowercase percent escapes',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3csvg fill=%27%23ff0%27/%3e")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%20fill%3D%22%23ff0%22%2F%3E")}'
    )
  );

  test(
    'should delegate a payload ending in an unterminated root open tag to svgo',
    processCSS(
      'h1{background:url("data:image/svg+xml,<svg fill=\'#ff0\'")}',
      "h1{background:url('data:image/svg+xml;charset=utf-8,')}"
    )
  );

  test(
    'should pass through a payload whose only content is a prolog',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,<?xml version=\'1.0\'?>#frag")}'
    )
  );

  test(
    'should pass through a root element with a different tag name',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,<svgx fill=\'#ff0\'/>#frag")}'
    )
  );

  // percent-encoding keeps the passthrough expectation stable; PostCSS
  // reserializes a literal '<!--' inside url strings.
  test(
    'should pass through a payload with an unterminated comment',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,%3Csvg%3E%3C!-- %3C/svg%3E")}'
    )
  );

  test(
    'should pass through a payload with an unterminated CDATA section',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,%3Csvg%3E%3Cstyle%3E%3C![CDATA[ %3C/svg%3E")}'
    )
  );

  // XML forbids '--' inside comments, so svgo rejects the whole payload.
  test(
    'should pass through a comment containing double dashes',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,%3C!--a--b--%3E%3Csvg fill=\'%23ff0\'/%3E%23frag")}'
    )
  );

  test(
    'should keep scanning after a question mark inside a processing instruction',
    processCSS(
      'h1{background:url("data:image/svg+xml,<?xml a?b?><svg fill=\'#ff0\'/>#frag")}',
      'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg fill="%23ff0"/>#frag\')}'
    )
  );

  test(
    'should treat a DOCTYPE internal subset as prolog and reattach the fragment',
    processCSS(
      "h1{background:url(\"data:image/svg+xml,<!DOCTYPE svg [ <!ENTITY x 'y'> ]><svg fill='#ff0'/>#frag\")}",
      'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg fill="%23ff0"/>#frag\')}'
    )
  );

  test(
    'should track nested svg open tags when finding the root close',
    processCSS(
      'h1{background:url("data:image/svg+xml,<svg><g><svg viewBox=\'0 0 1 1\'></svg></g></svg>#frag")}',
      'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg><svg viewBox="0 0 1 1"/></svg>#frag\')}'
    )
  );

  test(
    'should handle uppercase percent-encoded tags with trailing URL fragment',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3c%53%56%47%3e%3ccircle fill=%22#ff0%22/%3e%3c%2f%53%56%47%3e#frag")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,%3CSVG%3E%3Ccircle%20fill%3D%22%23ff0%22%2F%3E%3C%2FSVG%3E#frag")}'
    )
  );

  test(
    'should handle lowercase percent-encoded tags with trailing URL fragment',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3csvg%3e%3ccircle fill=%22#ff0%22/%3e%3c/svg%3e#frag")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%3E%3Ccircle%20fill%3D%22%23ff0%22%2F%3E%3C%2Fsvg%3E#frag")}'
    )
  );

  test(
    'should skip processing instructions inside root body and reattach fragment',
    processCSS(
      "h1{background:url(\"data:image/svg+xml,<svg><?xml-stylesheet href='style.css'?><circle fill='#ff0'/></svg>#frag\")}",
      "h1{background:url('data:image/svg+xml;charset=utf-8,<svg><?xml-stylesheet href=\\'style.css\\'?><circle fill=\"%23ff0\"/></svg>#frag')}"
    )
  );

  test(
    'should handle comment containing double dashes followed by non-bracket character',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,%3Csvg%3E%3C!-- --x --%3E%3Ccircle fill=\'%23ff0\'/%3E%3C/svg%3E#frag")}'
    )
  );

  test(
    'should pass through a payload with an unterminated comment before a fragment',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,%3Csvg%3E%3C!-- #frag")}'
    )
  );

  test(
    'should pass through a payload with an unterminated CDATA section before a fragment',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,%3Csvg%3E%3Cstyle%3E%3C![CDATA[ #frag")}'
    )
  );

  test(
    'should delegate a payload with an unterminated DOCTYPE before a fragment to svgo',
    processCSS(
      'h1{background:url("data:image/svg+xml,<!DOCTYPE svg [ #frag")}',
      "h1{background:url('data:image/svg+xml;charset=utf-8,')}"
    )
  );

  test(
    'should delegate a payload with an unterminated PI in prolog before a fragment to svgo',
    processCSS(
      'h1{background:url("data:image/svg+xml,<?xml unclosed #frag")}',
      "h1{background:url('data:image/svg+xml;charset=utf-8,')}"
    )
  );

  test(
    'should pass through an unterminated element open tag before a fragment',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,<svg><circle fill=\'red\'#frag")}'
    )
  );

  test(
    'should pass through an unterminated root close tag before a fragment',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,<svg><circle/></svg#frag")}'
    )
  );

  test(
    'should pass through an unterminated non-svg close tag before a fragment',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,<svg><circle/></g#frag")}'
    )
  );

  test(
    'should pass through a payload ending with open bracket before a fragment',
    passthroughCSS('h1{background:url("data:image/svg+xml,<#frag")}')
  );

  test(
    'should pass through a payload ending with open bracket inside body before a fragment',
    passthroughCSS('h1{background:url("data:image/svg+xml,<svg><#frag")}')
  );

  test(
    'should pass through a payload of only whitespace before a fragment',
    passthroughCSS('h1{background:url("data:image/svg+xml,   #frag")}')
  );

  test(
    'should handle invalid lowercase hex character in percent escape',
    passthroughCSS('h1{background:url("data:image/svg+xml,%3g%3C!-- # --%3E")}')
  );

  test(
    'should delegate to svgo when prolog ends with whitespace at EOF',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3C!-- # --%3E   ")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,")}'
    )
  );

  test(
    'should delegate to svgo when prolog ends immediately after open bracket at EOF',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3C!-- # --%3E<")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,")}'
    )
  );

  test(
    'should pass through when root body ends immediately after open bracket at EOF',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,<svg>%3C!-- # --%3E<")}'
    )
  );

  test(
    'should delegate to svgo when payload ends with exclamation mark after open bracket',
    processCSS(
      'h1{background:url("data:image/svg+xml,<!#frag")}',
      "h1{background:url('data:image/svg+xml;charset=utf-8,')}"
    )
  );

  test(
    'should delegate to svgo when comment delimiter has only one dash',
    processCSS(
      'h1{background:url("data:image/svg+xml,<!-x#frag")}',
      "h1{background:url('data:image/svg+xml;charset=utf-8,')}"
    )
  );

  test(
    'should delegate to svgo when cdata delimiter is malformed',
    processCSS(
      'h1{background:url("data:image/svg+xml,<![bad#frag")}',
      "h1{background:url('data:image/svg+xml;charset=utf-8,')}"
    )
  );

  test(
    'should delegate to svgo when doctype delimiter is malformed',
    processCSS(
      'h1{background:url("data:image/svg+xml,<!docbad#frag")}',
      "h1{background:url('data:image/svg+xml;charset=utf-8,')}"
    )
  );

  test(
    'should delegate to svgo when exclamation mark is followed by unknown construct',
    processCSS(
      'h1{background:url("data:image/svg+xml,<!foo#frag")}',
      "h1{background:url('data:image/svg+xml;charset=utf-8,')}"
    )
  );

  test(
    'should delegate to svgo when payload ends immediately after exclamation mark at EOF',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3C!-- # --%3E<!")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,")}'
    )
  );
});
