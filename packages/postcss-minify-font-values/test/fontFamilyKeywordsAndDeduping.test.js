import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should not treat a Unicode lookalike as a generic family keyword',
  processCSS('h1{font-family:"sаns-serif"}', 'h1{font-family:sаns-serif}')
);

describe('Generic and reserved keywords', () => {
  test(
    'should keep current generic and CSS-wide family keywords quoted',
    passthroughCSS(
      'h1{font-family:"math","ui-sans-serif","generic(foo)","revert","revert-layer"}'
    )
  );

  test(
    'should keep reserved and generic keywords quoted: default and none',
    passthroughCSS('h1{font-family:"default","none"}')
  );

  test(
    'should not unquote font name contains generic font family word at start',
    passthroughCSS('h1{font-family:"serif custom font"}')
  );

  test(
    'should not unquote font name contains generic font family word at middle',
    passthroughCSS('h1{font-family:"custom serif font"}')
  );

  test(
    'should not unquote font name contains generic font family word at end',
    passthroughCSS('h1{font-family:"custom font serif"}')
  );

  test(
    'should not unquote font name contains monospace generic font family word',
    passthroughCSS('h1{font-family:"Monospace Custom Font"}')
  );

  test(
    'should not unquote font name contains monospace generic font family word with spaces',
    passthroughCSS('h1{font-family:"  Monospace Custom Font  "}')
  );

  test(
    'should not unquote font names if they contain keywords',
    passthroughCSS('h1{font-family:"slab serif"}')
  );
});

describe('Font family deduplication and options', () => {
  test(
    'should remove duplicate families case-insensitively',
    processCSS(
      'h1{font-family:Inter,"inter",INTER,"Other"}',
      'h1{font-family:Inter,Other}'
    )
  );

  test(
    'should dedupe font family names',
    processCSS(
      'h1{font-family:Helvetica,Arial,Helvetica,sans-serif}',
      'h1{font-family:Helvetica,Arial,sans-serif}'
    )
  );

  test(
    'should dedupe lowercase generic font family name',
    processCSS(
      'h1{font-family:Helvetica,Arial,sans-serif,sans-serif}',
      'h1{font-family:Helvetica,Arial,sans-serif}'
    )
  );

  test(
    'should dedupe uppercase generic font family name',
    processCSS(
      'h1{font-family:Helvetica,Arial,SANS-SERIF,SANS-SERIF}',
      'h1{font-family:Helvetica,Arial,SANS-SERIF}'
    )
  );

  test(
    'should discard the rest of the declaration after a keyword',
    processCSS(
      'h1{font-family:Arial,sans-serif,Arial,"Trebuchet MS"}',
      'h1{font-family:Arial,sans-serif}',
      { removeAfterKeyword: true }
    )
  );

  test(
    'should not remove duplicates',
    passthroughCSS('h1{font-family:Helvetica,Helvetica}', {
      removeDuplicates: false,
    })
  );

  test(
    'should not remove after keyword',
    passthroughCSS('h1{font-family:serif,Times}', { removeAfterKeyword: false })
  );

  test(
    'should not remove quotes',
    passthroughCSS('h1{font-family:"Glyphicons Halflings","Arial"}', {
      removeQuotes: false,
    })
  );

  test(
    'should not dedupe lower case monospace',
    passthroughCSS('font-family:monospace,monospace')
  );

  test(
    'should not dedupe uppercase monospace',
    passthroughCSS('font-family:MONOSPACE,MONOSPACE')
  );

  test(
    'should not dedupe monospace (2)',
    passthroughCSS(
      'font:italic small-caps normal 13px/150% monospace,monospace'
    )
  );

  test(
    'should preserve monospace, monospace system-font hack',
    passthroughCSS('h1{font-family:monospace,monospace}')
  );
});
