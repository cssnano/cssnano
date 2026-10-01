import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS, processor } = processCSSFactory(plugin);

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
    'should pass through a payload ending in an unterminated root open tag',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,<svg fill=\'#ff0\'")}'
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
    'should preserve URL fragment when processing instruction contains a question mark',
    processCSS(
      'h1{background:url("data:image/svg+xml,<?xml a?b?><svg fill=\'%23ff0\'/>#frag")}',
      'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg fill="%23ff0"/>#frag\')}'
    )
  );

  test(
    'should preserve URL fragment when prolog contains a DOCTYPE internal subset',
    processCSS(
      "h1{background:url(\"data:image/svg+xml,<!DOCTYPE svg [ <!ENTITY x 'y'> ]><svg fill='%23ff0'/>#frag\")}",
      'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg fill="%23ff0"/>#frag\')}'
    )
  );

  test(
    'should preserve URL fragment when payload contains nested svg elements',
    processCSS(
      'h1{background:url("data:image/svg+xml,<svg><g><svg viewBox=\'0 0 1 1\'></svg></g></svg>#frag")}',
      'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg><svg viewBox="0 0 1 1"/></svg>#frag\')}'
    )
  );

  test(
    'should handle uppercase percent-encoded tags with trailing URL fragment',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3c%53%56%47%3e%3ccircle fill=%22%23ff0%22/%3e%3c%2f%53%56%47%3e#frag")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,%3CSVG%3E%3Ccircle%20fill%3D%22%23ff0%22%2F%3E%3C%2FSVG%3E#frag")}'
    )
  );

  test(
    'should handle lowercase percent-encoded tags with trailing URL fragment',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3csvg%3e%3ccircle fill=%22%23ff0%22/%3e%3c/svg%3e#frag")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%3E%3Ccircle%20fill%3D%22%23ff0%22%2F%3E%3C%2Fsvg%3E#frag")}'
    )
  );

  test(
    'should preserve URL fragment when root body contains processing instructions',
    processCSS(
      "h1{background:url(\"data:image/svg+xml,<svg><?xml-stylesheet href='style.css'?><circle fill='%23ff0'/></svg>#frag\")}",
      "h1{background:url('data:image/svg+xml;charset=utf-8,<svg><?xml-stylesheet href=\\'style.css\\'?><circle fill=\"%23ff0\"/></svg>#frag')}"
    )
  );

  test(
    'should pass through a comment containing double dashes followed by non-bracket character',
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
    'should pass through a payload with an unterminated DOCTYPE before a fragment',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,<!DOCTYPE svg [ #frag")}'
    )
  );

  test(
    'should pass through a payload with an unterminated processing instruction before a fragment',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,<?xml unclosed #frag")}'
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
    'should pass through invalid percent escape sequences',
    passthroughCSS('h1{background:url("data:image/svg+xml,%3g%3C!-- # --%3E")}')
  );

  test(
    'should pass through when prolog ends with whitespace at EOF',
    passthroughCSS('h1{background:url("data:image/svg+xml,%3C!-- # --%3E   ")}')
  );

  test(
    'should pass through when prolog ends immediately after open bracket at EOF',
    passthroughCSS('h1{background:url("data:image/svg+xml,%3C!-- # --%3E<")}')
  );

  test(
    'should pass through when root body ends immediately after open bracket at EOF',
    passthroughCSS(
      'h1{background:url("data:image/svg+xml,<svg>%3C!-- # --%3E<")}'
    )
  );

  test(
    'should pass through when payload ends with exclamation mark after open bracket',
    passthroughCSS('h1{background:url("data:image/svg+xml,<!#frag")}')
  );

  test(
    'should pass through when comment delimiter has only one dash',
    passthroughCSS('h1{background:url("data:image/svg+xml,<!-x#frag")}')
  );

  test(
    'should pass through when cdata delimiter is malformed',
    passthroughCSS('h1{background:url("data:image/svg+xml,<![bad#frag")}')
  );

  test(
    'should pass through when doctype delimiter is malformed',
    passthroughCSS('h1{background:url("data:image/svg+xml,<!docbad#frag")}')
  );

  test(
    'should pass through unknown exclamation constructs',
    passthroughCSS('h1{background:url("data:image/svg+xml,<!foo#frag")}')
  );

  test(
    'should pass through when payload ends immediately after exclamation mark at EOF',
    passthroughCSS('h1{background:url("data:image/svg+xml,%3C!-- # --%3E<!")}')
  );
});
