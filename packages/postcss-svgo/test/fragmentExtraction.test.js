import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

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

describe('Unencoded hash inside markup treated as fragment delimiter per WHATWG', () => {
  test(
    'should pass through when unencoded hash in attribute truncates payload',
    passthroughCSS(
      "h1 { background: url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' data-info='a > b' fill='#ff0'/>\") }"
    )
  );

  test(
    'should pass through when unencoded hash in self-closing tag truncates payload',
    passthroughCSS(
      "h1 { background: url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' aria-label='a/>b' fill='#ff0'/>\") }"
    )
  );

  test(
    'should pass through when unencoded hash follows a leading comment',
    passthroughCSS(
      'h1 { background: url("data:image/svg+xml,%3C!-- </svg> --%3E<svg fill=\'#ff0\'/>") }'
    )
  );

  test(
    'should pass through when unencoded hash in attribute follows a leading comment with fragment',
    passthroughCSS(
      "h1 { background: url(\"data:image/svg+xml,%3C!-- </svg> --%3E<svg id='icon' fill='#ff0'/>\") }"
    )
  );
});

describe('Prolog handling before the root element', () => {
  test(
    'should reattach a fragment after an XML declaration and DOCTYPE',
    processCSS(
      "h1{background:url(\"data:image/svg+xml,<?xml version='1.0'?><!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'><svg fill='%23ff0'/>#frag\")}",
      'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg fill="%23ff0"/>#frag\')}'
    )
  );

  test(
    'should reattach a fragment after a percent-encoded XML declaration',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%3F%3E%3Csvg%3E%3Ccircle%20fill%3D%22%23ff0%22%2F%3E%3C%2Fsvg%3E#frag")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%3E%3Ccircle%20fill%3D%22%23ff0%22%2F%3E%3C%2Fsvg%3E#frag")}'
    )
  );

  test(
    'should reattach a fragment after a percent-encoded DOCTYPE',
    processCSS(
      'h1{background:url("data:image/svg+xml,%3C%21DOCTYPE%20svg%20PUBLIC%20%22-//W3C//DTD%20SVG%201.1//EN%22%3E%3Csvg%3E%3Ccircle%20fill%3D%22%23ff0%22%2F%3E%3C%2Fsvg%3E#frag")}',
      'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%3E%3Ccircle%20fill%3D%22%23ff0%22%2F%3E%3C%2Fsvg%3E#frag")}'
    )
  );

  test(
    'should skip whitespace and comments between prolog constructs',
    processCSS(
      "h1{background:url(\"data:image/svg+xml, <!-- c --> <?xml version='1.0'?> <!-- d --> <svg fill='%23ff0'/>#frag\")}",
      'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg fill="%23ff0"/>#frag\')}'
    )
  );
});
