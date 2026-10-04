import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { processCSSFactory } from '../../../util/testHelpers.js';
import discardEmptyPlugin from '../src/index.js';

const { passthroughCSS, processCSS, processor } =
  processCSSFactory(discardEmptyPlugin);

describe('Empty @layer', () => {
  test(
    'should discard empty layers after a non-empty layer with the same name',
    processCSS(
      '@layer components{.a{display:flex}}@layer components{}',
      '@layer components{.a{display:flex}}'
    )
  );

  test(
    'should keep an empty layer when the earlier block with that name is inside @media',
    passthroughCSS(
      '@media print{@layer x{.a{color:red}}}@layer x{}@layer y{.b{color:blue}}@layer x{.b{color:green}}'
    )
  );

  test(
    'should keep an empty layer when the earlier block is inside @supports',
    passthroughCSS('@supports (a:b){@layer x{.a{color:red}}}@layer x{}')
  );

  test(
    'should keep an empty layer when the earlier block is inside @container (conservative: @container is treated as a condition)',
    passthroughCSS('@container (width>1px){@layer x{.a{color:red}}}@layer x{}')
  );

  test(
    'should keep an empty layer when the earlier block is inside @when, which is not a known unconditional wrapper',
    passthroughCSS('@when media(print){@layer x{.a{color:red}}}@layer x{}')
  );

  test(
    'should keep an empty layer when the earlier block is inside an unknown at-rule',
    passthroughCSS('@unknown foo{@layer x{.a{color:red}}}@layer x{}')
  );

  test(
    'should keep an empty layer when the earlier block is inside a style rule',
    passthroughCSS('.a{@layer x{.b{color:red}}}@layer x{}')
  );

  test(
    'should keep an empty layer when its only earlier block is inside a nested condition it is outside of',
    passthroughCSS(
      '@media print{@supports (a:b){@layer x{.a{color:red}}}@layer x{}}'
    )
  );

  test(
    'should discard an empty layer inside nested conditions after a block in the same conditions',
    processCSS(
      '@media print{@supports (a:b){@layer x{.a{color:red}}@layer x{}}}',
      '@media print{@supports (a:b){@layer x{.a{color:red}}}}'
    )
  );

  test(
    'should keep an empty layer when the earlier block is inside an unnamed layer that makes its path differ',
    passthroughCSS('@layer{@layer y{.a{color:red}}}@layer y{}')
  );

  test(
    'should keep an empty layer after a block of an unnamed layer sibling with the same inner name',
    passthroughCSS('@layer{@layer y{.a{color:red}}}@layer{@layer y{}}')
  );

  test(
    'should discard an empty layer inside an unnamed layer after a block with the same name in that unnamed layer',
    processCSS(
      '@layer{@layer y{.a{color:red}}@layer y{}}',
      '@layer{@layer y{.a{color:red}}}'
    )
  );

  test(
    'should discard an empty layer after an earlier empty block of the same layer',
    processCSS('@layer x{}@layer x{}', '@layer x{}')
  );

  test(
    'should discard an empty layer when it shares the conditional ancestor of the earlier block',
    processCSS(
      '@media print{@layer x{.a{color:red}}@layer x{}}',
      '@media print{@layer x{.a{color:red}}}'
    )
  );

  test(
    'should discard an empty layer inside @media after an unconditional block with the same name',
    processCSS(
      '@layer x{.a{color:red}}@media print{@layer x{}}',
      '@layer x{.a{color:red}}'
    )
  );

  test(
    'should keep an uppercase @LAYER that is the first block of its layer',
    passthroughCSS(
      '@LAYER x{}@layer y{.b{color:blue}}@layer x{.b{color:green}}'
    )
  );

  test(
    'should discard an empty uppercase @LAYER after a non-empty layer with the same name',
    processCSS('@layer x{.a{color:red}}@LAYER x{}', '@layer x{.a{color:red}}')
  );

  test(
    'should discard an empty layer inside an uppercase @MEDIA with a shared ancestor',
    processCSS(
      '@MEDIA print{@layer x{.a{color:red}}@layer x{}}',
      '@MEDIA print{@layer x{.a{color:red}}}'
    )
  );

  test(
    'should discard an empty layer after a @layer statement that declares its name',
    processCSS('@layer x, y;@layer x{}', '@layer x, y')
  );

  test(
    'should keep an empty layer when the @layer statement declaring its name is inside @media',
    passthroughCSS('@media print{@layer x, y;}@layer x{}')
  );

  test(
    'should keep a layer block holding only a /*! preserved comment after a non-empty layer with the same name',
    passthroughCSS('@layer x{.a{color:red}}@layer x{/*! keep */}')
  );

  test(
    'should keep an empty layer after a @layer statement with an invalid name list',
    passthroughCSS(
      '@layer a, b c;@layer a{}@layer d{.a{color:red}}@layer a{.b{color:blue}}'
    )
  );

  test(
    'should not split an escaped comma in a @layer statement name',
    passthroughCSS(
      '@layer a\\,b;@layer b{}@layer c{.a{color:red}}@layer b{.b{color:blue}}'
    )
  );

  test(
    'should discard an empty layer named by an escaped-comma statement name',
    processCSS('@layer a\\,b;@layer a\\,b{}', '@layer a\\,b')
  );

  test(
    'should keep an empty layer when a statement with whitespace between name segments is invalid',
    passthroughCSS(
      '@layer a . b;@layer a.b{}@layer c{.a{color:red}}@layer a.b{.b{color:blue}}'
    )
  );

  test(
    'should discard an empty layer declared by a statement with dash-prefixed, non-ASCII and escaped names',
    processCSS(
      '@layer -a, --b, é, \\31 x;@layer --b{}@layer é{}@layer \\31 x{}',
      '@layer -a, --b, é, \\31 x'
    )
  );

  test(
    'should discard an empty layer named by a statement ending in a hex escape',
    processCSS('@layer \\31;@layer \\31{}', '@layer \\31')
  );

  test(
    'should keep an empty layer after a statement whose name starts with a digit, which is not an <ident>',
    passthroughCSS(
      '@layer 1a;@layer 1a{}@layer c{.a{color:red}}@layer 1a{.b{color:blue}}'
    )
  );

  test(
    'should keep an empty layer after a statement whose name starts with a dash and a digit',
    passthroughCSS(
      '@layer -1;@layer -1{}@layer c{.a{color:red}}@layer -1{.b{color:blue}}'
    )
  );

  test(
    'should keep an empty layer after a statement with a trailing comma',
    passthroughCSS(
      '@layer a,;@layer a{}@layer c{.a{color:red}}@layer a{.b{color:blue}}'
    )
  );

  test(
    'should keep an empty layer after a statement with a lone dash name',
    passthroughCSS(
      '@layer -;@layer -{}@layer c{.a{color:red}}@layer -{.b{color:blue}}'
    )
  );

  test(
    'should resolve a @layer statement nested in a parent layer against the parent path',
    processCSS('@layer p{@layer a.b;}@layer p.a.b{}', '@layer p{@layer a.b;}')
  );

  test(
    'should keep an empty layer named like a statement nested in a parent layer when the path differs',
    passthroughCSS(
      '@layer p{@layer a.b;}@layer a.b{}@layer c{.a{color:red}}@layer a.b{.b{color:blue}}'
    )
  );

  test(
    'should discard empty layers after a non-empty layer with an equivalent path',
    processCSS(
      '@layer a{@layer b{.a{display:flex}}}@layer a.b{}',
      '@layer a{@layer b{.a{display:flex}}}'
    )
  );

  test(
    'should discard an empty layer whose name is the parent of a dotted name in an earlier statement',
    processCSS('@layer a.b;@layer a{}', '@layer a.b')
  );

  test(
    'should discard an empty layer whose name is the parent of a dotted name in an earlier block',
    processCSS(
      '@layer a.b{.x{color:red}}@layer a{}',
      '@layer a.b{.x{color:red}}'
    )
  );

  test(
    'should keep an empty layer whose name is the child of a dotted name in an earlier statement, which declares only its prefixes',
    passthroughCSS('@layer a;@layer a.b{}')
  );

  test(
    'should keep an empty layer after a block with an invalid prelude, which declares nothing',
    passthroughCSS('@layer a b{.x{color:red}}@layer a{}')
  );

  test(
    'should keep an empty layer after a block with a comma-separated prelude, which declares nothing',
    passthroughCSS('@layer a,b{.x{color:red}}@layer a{}')
  );

  test(
    'should keep an empty nested layer when its earlier block is inside a condition within the parent layer',
    passthroughCSS('@layer a{@media print{@layer b{.x{color:red}}}@layer b{}}')
  );

  test(
    'should discard an empty nested layer when its earlier block is in the same layer outside any condition',
    processCSS(
      '@layer a{@layer b{.x{color:red}}@media print{@layer b{}}}',
      '@layer a{@layer b{.x{color:red}}}'
    )
  );

  for (const keyword of [
    'initial',
    'INHERIT',
    'unset',
    'Revert',
    'revert-layer',
    'REVERT-LAYER',
  ]) {
    test(
      `should keep an empty layer after a statement using the CSS-wide keyword ${keyword}, which makes it invalid`,
      passthroughCSS(
        `@layer ${keyword}, x;@layer x{}@layer y{.a{color:red}}@layer x{.b{color:blue}}`
      )
    );
  }

  test(
    'should keep an empty layer after a statement with a CSS-wide keyword as a later path segment',
    passthroughCSS(
      '@layer a.initial;@layer a.initial{}@layer y{.a{color:red}}@layer a.initial{.b{color:blue}}'
    )
  );

  test(
    'should keep an empty layer after a statement with a no-break space before the name, which is not CSS whitespace',
    passthroughCSS(
      '@layer a, b;@layer b{}@layer y{.a{color:red}}@layer b{.b{color:blue}}'
    )
  );

  test(
    'should keep an empty layer after a statement padded with a no-break space, which is not CSS whitespace',
    passthroughCSS(
      '@layer  b;@layer b{}@layer y{.a{color:red}}@layer b{.b{color:blue}}'
    )
  );

  test(
    'should keep an empty layer after a statement with a vertical tab between names, which is not CSS whitespace',
    passthroughCSS(
      '@layer a,\u000bb;@layer b{}@layer y{.a{color:red}}@layer b{.b{color:blue}}'
    )
  );

  test(
    'should discard an empty layer after a statement whose name is an escape for the same characters',
    processCSS('@layer \\61;@layer a{}', '@layer \\61')
  );

  test(
    'should discard an empty layer whose name is an escape of an earlier block name',
    processCSS(
      '@layer a{.a{color:red}}@layer \\61{}',
      '@layer a{.a{color:red}}'
    )
  );

  test(
    'should discard an empty layer after a statement with whitespace before a comma',
    processCSS('@layer a ,b;@layer a{}', '@layer a ,b')
  );

  test(
    'should keep an empty layer after a statement with a whitespace-only name list entry',
    passthroughCSS(
      '@layer a, ,b;@layer b{}@layer y{.a{color:red}}@layer b{.b{color:blue}}'
    )
  );

  test(
    'should discard an empty layer after a statement with comments around the names',
    processCSS(
      '@layer/*c*/x/*c*/,/*c*/y;@layer y{}',
      '@layer/*c*/x/*c*/,/*c*/y'
    )
  );

  test(
    'should discard an empty layer after a statement with a comment between name segments, which CSS ignores',
    processCSS('@layer a/*c*/.b;@layer a.b{}', '@layer a/*c*/.b')
  );

  test(
    'should keep an empty layer after a statement with a comment between idents, which leaves them unseparated',
    passthroughCSS(
      '@layer a/*c*/b;@layer a{}@layer y{.a{color:red}}@layer a{.b{color:blue}}'
    )
  );

  test(
    'should keep an empty layer after @import layer(x), which is not tracked as a declaration',
    passthroughCSS(
      '@import "a.css" layer(x);@layer x{}@layer y{.a{color:red}}@layer x{.b{color:blue}}'
    )
  );

  test('should report a removal message for a discarded empty layer', async () => {
    const result = await processor('@layer x{.a{color:red}}@layer x{}');

    assert.deepStrictEqual(
      result.messages.map(({ type, node }) => [type, node.params]),
      [['removal', 'x']]
    );
  });
});
