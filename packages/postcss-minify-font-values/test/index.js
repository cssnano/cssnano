'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');
const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should not unquote font names with a leading number',
  passthroughCSS('h1{font-family:"11880-icons"!important;}')
);

test(
  'should unquote font names',
  processCSS(
    'h1{font-family:"Helvetica Neue"}',
    'h1{font-family:Helvetica Neue}'
  )
);

test(
  'should unquote font names with one character name',
  processCSS('h1{font-family:"A"}', 'h1{font-family:A}')
);

test(
  'should unquote font names with one character name #1',
  processCSS(
    'h1{font-family:"A";font-family:"A"}',
    'h1{font-family:A;font-family:A}'
  )
);

test(
  'should unquote font names with space at the start',
  processCSS(
    'h1{font-family:" Helvetica Neue"}',
    'h1{font-family:\\ Helvetica Neue}'
  )
);

test(
  'should unquote font names with space at the end',
  processCSS(
    'h1{font-family:"Helvetica Neue "}',
    'h1{font-family:Helvetica Neue\\ }'
  )
);

test(
  'should unquote and join identifiers with a slash, if numeric',
  processCSS('h1{font-family:"Bond 007"}', 'h1{font-family:Bond\\ 007}')
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
  'should unquote and join identifiers with a slash',
  passthroughCSS('h1{font-family:Ahem\\!}')
);

test(
  'should unquote with escaped `/` character',
  passthroughCSS('h1{font-family:Red\\/Black}')
);

test(
  'should unquote with multiple escaped ` ` character',
  passthroughCSS('h1{font-family:Hawaii \\  \\  \\  \\  \\ \\\\35}')
);

test(
  'should not unquote if it would produce a bigger identifier',
  passthroughCSS('h1{font-family:"Call 0118 999 881 999 119 725 3"}')
);

test(
  'should not unquote font names if they contain keywords',
  passthroughCSS('h1{font-family:"slab serif"}')
);

test(
  'should not unquote font names with multiple \\',
  passthroughCSS('h1{font-family:"\\5FAE\\8F6F\\96C5\\9ED1"}')
);

test(
  'should not unquote font names with multiple \\ #1',
  passthroughCSS('h1{font-family:"\\5B8B\\4F53"}')
);

test(
  'should minimise space inside a legal font name',
  processCSS(
    'h1{font-family:Lucida     Grande}',
    'h1{font-family:Lucida Grande}'
  )
);

test(
  'should minimise space around a list of font names',
  processCSS(
    'h1{font-family:Arial, Helvetica, sans-serif}',
    'h1{font-family:Arial,Helvetica,sans-serif}'
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
  'should convert the font shorthand property',
  processCSS(
    'h1{font:italic small-caps normal 13px/150% "Helvetica Neue", sans-serif}',
    'h1{font:italic small-caps normal 13px/150% Helvetica Neue,sans-serif}'
  )
);

test(
  'should convert shorthand with zero unit line height',
  processCSS(
    'h1{font:italic small-caps normal 13px/1.5 "Helvetica Neue", sans-serif}',
    'h1{font:italic small-caps normal 13px/1.5 Helvetica Neue,sans-serif}'
  )
);

test(
  'should convert the font shorthand property with upperlower keyword, unquoted',
  processCSS(
    'h1{font:italic Helvetica Neue,sans-serif,Arial}',
    'h1{font:italic Helvetica Neue,sans-serif}',
    { removeAfterKeyword: true }
  )
);

test(
  'should convert the font shorthand property with uppercase keyword, unquoted',
  processCSS(
    'h1{font:italic Helvetica Neue,SANS-SERIF,Arial}',
    'h1{font:italic Helvetica Neue,SANS-SERIF}',
    { removeAfterKeyword: true }
  )
);

test(
  'should join identifiers in the shorthand property',
  processCSS(
    'h1{font:italic "Bond 007",sans-serif}',
    'h1{font:italic Bond\\ 007,sans-serif}'
  )
);

test(
  'should join non-digit identifiers in the shorthand property',
  processCSS('h1{font:italic "Bond !",serif}', 'h1{font:italic Bond \\!,serif}')
);

test(
  'should correctly escape special characters at the start',
  processCSS('h1{font-family:"$42"}', 'h1{font-family:\\$42}')
);

test(
  'should correctly escape special characters at the end',
  passthroughCSS('h1{font-family:Helvetica Neue\\ }')
);

test(
  'should correctly escape multiple special with numbers font name',
  passthroughCSS('h1{font-family:\\31 \\ 2\\ 3\\ 4\\ 5}')
);

test(
  'should correctly escape multiple ` `',
  passthroughCSS('h1{font-family:f \\  \\  \\ \\ o \\  \\  \\ \\ o}')
);

test(
  'should correctly escape only spaces font name',
  passthroughCSS('h1{font-family:\\ \\ \\ }')
);

test(
  'should correctly escape only two spaces font name',
  passthroughCSS('h1{font-family:"  "}')
);

test(
  'should correctly escape only spaces font name with quotes',
  passthroughCSS('h1{font-family:"     "}')
);

test(
  'should unquote multiple escape `[` characters',
  passthroughCSS('h1{font-family:"STHeiti Light [STXihei]"}')
);

test(
  'should not mangle font names (2)',
  passthroughCSS('h1{font-family:FF Din Pro,FF Din Pro Medium}')
);

test(
  'should handle rem values',
  processCSS(
    'h1{font:bold 2.2rem/.9 "Open Sans Condensed", sans-serif}',
    'h1{font:700 2.2rem/.9 Open Sans Condensed,sans-serif}'
  )
);

test(
  "should pass through when it doesn't find a font property",
  passthroughCSS('h1{color:black;text-decoration:none}')
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
  passthroughCSS('font:italic small-caps normal 13px/150% monospace,monospace')
);

test(
  'should not mangle custom props',
  passthroughCSS(':root{--sans:Helvetica}header{font-family:var(--sans)}')
);

test(
  'should minify font-weight',
  processCSS('h1{font-weight:bold}', 'h1{font-weight:700}')
);

test(
  'should minify font-weight #1',
  processCSS('h1{font-weight:normal}', 'h1{font-weight:400}')
);

test(
  'should minify uppercase font-weight',
  processCSS('h1{font-weight:BOLD}', 'h1{font-weight:700}')
);

test(
  'should minify uppercase font-weight #1',
  processCSS(
    'h1{font-style:normal;font-weight:normal}',
    'h1{font-style:normal;font-weight:400}'
  )
);

test(
  'should minify uppercase font-weight #2',
  processCSS(
    'h1{font-weight:normal;font-style:normal}',
    'h1{font-weight:400;font-style:normal}'
  )
);

test(
  'should pass through not minimized font-weight',
  passthroughCSS('h1{font-weight:500}', 'h1{font-weight:500}')
);

test(
  'should pass through not minimized font-weight #1',
  passthroughCSS('h1{font-weight:lighter}', 'h1{font-weight:lighter}')
);

test(
  'should pass through unrelated font lowercase properties',
  passthroughCSS('h1{font-style:normal}')
);

test(
  'should pass through unrelated font uppercase properties',
  passthroughCSS('h1{font-style:NORMAL}')
);

test(
  'should minify font property',
  processCSS(
    'h1{font:BOLD italic 20px Times New Roman}',
    'h1{font:700 italic 20px Times New Roman}'
  )
);

test(
  'should minify font property #2',
  passthroughCSS('h1{font:var(--foo) 1.2em Fira Sans,serif}')
);

test(
  'should minify font property #3',
  processCSS(
    'h1{font:var(--foo) bold 16px/2 cursive}',
    'h1{font:var(--foo) 700 16px/2 cursive}'
  )
);

test(
  'should minify font property #4',
  processCSS(
    'h1{font:italic var(--foo) bold 16px/2 cursive}',
    'h1{font:italic var(--foo) 700 16px/2 cursive}'
  )
);

test(
  'should minify font property #5',
  processCSS(
    'h1{font:italic 1.2em "Helvetica Neue", var(--foo)}',
    'h1{font:italic 1.2em Helvetica Neue,var(--foo)}'
  )
);

test(
  'should minify font property #6',
  processCSS(
    'h1{font:oblique 10deg 10px "Helvetica Neue"}',
    'h1{font:oblique 10deg 10px Helvetica Neue}'
  )
);

test(
  'should pass through css variables in font',
  passthroughCSS('h1{font:var(--font-size)}')
);

test(
  'should pass through css variables in font #2',
  passthroughCSS('h1{font:var(--font-size) sans-serif}')
);

test(
  'should pass through css variables in font #3',
  passthroughCSS('h1{font:var(--font-family),sans-serif}')
);

test(
  'should pass through css variables in font #4',
  passthroughCSS('h1{font:italic 1.2em var(--foo)}')
);

test(
  'should pass through css variables in font #5',
  passthroughCSS('h1{font:italic 1.2em sans-serif,var(--foo)}')
);

test(
  'should pass through css variables in font #6',
  passthroughCSS('h1{font:italic var(--foo),monospace}')
);

test(
  'should pass through css variables in font #7',
  passthroughCSS('h1{font:italic var(--foo) monospace}')
);

test(
  'should pass through css variables in font #8',
  passthroughCSS('h1{font:italic monospace,var(--foo)}')
);

test(
  'should pass through css variables in font #9',
  passthroughCSS('h1{font:italic monospace,var(--foo)}')
);

test(
  'should pass through css variables in font-weight',
  passthroughCSS('h1{font-weight:var(--font-size)}')
);

test(
  'should pass through css variables in font-family',
  passthroughCSS('h1{font-family:var(--font-size)}')
);

test(
  'should pass through css variables in font-family #2',
  passthroughCSS('h1{font-family:var(--font-size), Helvetica}')
);

test(
  'should pass through env variables in font-weight',
  passthroughCSS('h1{font-weight:env(--font-size)}')
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
test.run();
