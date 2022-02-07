'use strict';
const { readFileSync: file } = require('fs');
const assert = require('uvu/assert');
const { test } = require('uvu');
const postcss = require('postcss');
const filters = require('pleeease-filters');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');
const plugin = require('../src/index.js');
const { encode, decode } = require('../src/lib/url.js');

const { processCSS: filterEffects } = processCSSFactory([filters(), plugin()]);
const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should not mangle filter effects',
  filterEffects(
    'h1{filter:blur(5px)}',
    'h1{filter:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><filter id="filter"><feGaussianBlur stdDeviation="5" /></filter></svg>#filter\');filter:blur(5px)}'
  )
);

test(
  'should optimise inline svg',
  processCSS(
    'h1{background:url(\'data:image/svg+xml;utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="%23ff0"/></svg>\')}'
  )
);

test(
  'should optimise inline svg (uppercase property)',
  processCSS(
    'h1{background:URL(\'data:image/svg+xml;utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    'h1{background:URL(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="%23ff0"/></svg>\')}'
  )
);

test(
  'should optimise inline svg in base64',
  processCSS(
    "h1{background:url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIGZpbGw9InllbGxvdyIgLz48IS0tdGVzdCBjb21tZW50LS0+PC9zdmc+')}",
    "h1{background:url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbDpzcGFjZT0icHJlc2VydmUiPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQwIiBmaWxsPSIjZmYwIi8+PC9zdmc+')}"
  )
);

test(
  'should optimise inline svg in base64 but ignore non-base64 url ending',
  processCSS(
    "h1{background:url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIGZpbGw9InllbGxvdyIgLz48IS0tdGVzdCBjb21tZW50LS0+PC9zdmc+#test')}",
    "h1{background:url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbDpzcGFjZT0icHJlc2VydmUiPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQwIiBmaWxsPSIjZmYwIi8+PC9zdmc+#test')}"
  )
);

test(
  'should optimise inline svg in base64 and respect quotes',
  processCSS(
    'h1{background:url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIGZpbGw9InllbGxvdyIgLz48IS0tdGVzdCBjb21tZW50LS0+PC9zdmc+")}',
    'h1{background:url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbDpzcGFjZT0icHJlc2VydmUiPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQwIiBmaWxsPSIjZmYwIi8+PC9zdmc+")}'
  )
);

test(
  'should optimise inline svg in all urls',
  processCSS(
    'h1{background:' +
      [
        'url(\'data:image/svg+xml;utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')',
        'url(\'data:image/svg+xml;utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')',
      ].join(' ') +
      '}',
    'h1{background:' +
      [
        'url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="%23ff0"/></svg>\')',
        'url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="%23ff0"/></svg>\')',
      ].join(' ') +
      '}'
  )
);

test(
  'should optimise inline svg with standard charset definition',
  processCSS(
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="%23ff0"/></svg>\')}'
  )
);

test(
  'should optimise inline svg without charset definition',
  processCSS(
    'h1{background:url(\'data:image/svg+xml,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="%23ff0"/></svg>\')}'
  )
);

test(
  'should optimise uri-encoded inline svg',
  processCSS(
    "h1{background:url('data:image/svg+xml;utf-8,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22utf-8%22%3F%3E%3C!DOCTYPE%20svg%20PUBLIC%20%22-%2F%2FW3C%2F%2FDTD%20SVG%201.1%2F%2FEN%22%20%22http%3A%2F%2Fwww.w3.org%2FGraphics%2FSVG%2F1.1%2FDTD%2Fsvg11.dtd%22%3E%3Csvg%20version%3D%221.1%22%20id%3D%22Layer_1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20xml%3Aspace%3D%22preserve%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20fill%3D%22yellow%22%20%2F%3E%3C!--test%20comment--%3E%3C%2Fsvg%3E')}",
    "h1{background:url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' xml:space='preserve'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23ff0'/%3E%3C/svg%3E\")}"
  )
);

test(
  'should allow users to customise the output',
  processCSS(
    'h1{background:url(\'data:image/svg+xml;utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="%23ff0"/><!--test comment--></svg>\')}',
    {
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              removeComments: false,
            },
          },
        },
      ],
    }
  )
);

test(
  'should not throw when decoding a svg',
  processCSS(
    "h1{-webkit-mask-box-image: url(\"data:image/svg+xml;charset=utf-8,<svg height='35' viewBox='0 0 96 70' width='48' xmlns='http://www.w3.org/2000/svg'><path d='m84 35c1 7-5 37-42 35-37 2-43-28-42-35-1-7 5-37 42-35 37-2 43 28 42 35z'/></svg>\") 50% 56% 46% 42%;}",
    'h1{-webkit-mask-box-image: url(\'data:image/svg+xml;charset=utf-8,<svg height="35" viewBox="0 0 96 70" width="48" xmlns="http://www.w3.org/2000/svg"><path d="M84 35c1 7-5 37-42 35C5 72-1 42 0 35-1 28 5-2 42 0c37-2 43 28 42 35z"/></svg>\') 50% 56% 46% 42%;}'
  )
);

test(
  'should encode unencoded data',
  processCSS(
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#ff0"/></svg>\')}',
    "h1{background:url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23ff0'/%3E%3C/svg%3E\")}",
    { encode: true }
  )
);

test(
  'should decode encoded data',
  processCSS(
    "h1{background:url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23ff0'/%3E%3C/svg%3E\")}",
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="%23ff0"/></svg>\')}',
    { encode: false }
  )
);

test(
  'should not fail on "malformed" svgs',
  processCSS(
    "h1{background-image:url(\"data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg'><line stroke-width='2' stroke='rgb(255,0,0)' x1='0' y1='100%' x2='100%' y2='0'></line></svg>\")}",
    'h1{background-image:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><line stroke-width="2" stroke="red" y1="100%" x2="100%"/></svg>\')}'
  )
);

test(
  'should encode "malformed" svgs',
  processCSS(
    "h1{background-image:url(\"data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg'><line stroke-width='2' stroke='rgb(255,0,0)' x1='0' y1='100%' x2='100%' y2='0'></line></svg>\")}",
    "h1{background-image:url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cline stroke-width='2' stroke='red' y1='100%25' x2='100%25'/%3E%3C/svg%3E\")}",
    { encode: true }
  )
);

test('should not warn on "escaped-quotes" svgs', async () => {
  const css =
    'h1{background-image:url("data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"400\\" height=\\"400\\" fill-opacity=\\".25\\" ><rect x=\\"200\\" width=\\"200\\" height=\\"200\\" /><rect y=\\"200\\" width=\\"200\\" height=\\"200\\" /></svg>")}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.is(result.messages.length, 0);
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
    "h1{background:url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23ff0'/%3E%3C/svg%3E\")}",
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

test(
  'should skip invalid svg',
  processCSS(
    'h1{background-image:url("data:image/svg+xml;charset=utf-8,foo")}',
    'h1{background-image:url("data:image/svg+xml;charset=utf-8,foo")}'
  )
);

test(
  'should skip invalid svg in base64',
  processCSS(
    'h1{background-image:url("data:image/svg+xml;base64,foo")}',
    'h1{background-image:url("data:image/svg+xml;base64,foo")}'
  )
);

test(
  'should skip when data URI contain invalid media type',
  processCSS(
    'h1{background-image:url("data:image/svg;charset=utf-8,foo")}',
    'h1{background-image:url("data:image/svg;charset=utf-8,foo")}'
  )
);

test(
  'should skip when data URI contain charset is not in `utf-8`',
  processCSS(
    'h1{background-image:url("data:image/svg;charset=US-ASCII,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>")}',
    'h1{background-image:url("data:image/svg;charset=US-ASCII,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>")}'
  )
);

test('should warn on SVG containing unclosed tags', async () => {
  const css =
    'h1{background:url(data:image/svg+xml;charset=utf-8,<svg>style type="text/css"><![CDATA[ svg { fill: red; } ]]></style></svg>)}';
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.is(result.messages.length, 1);
  assert.is(result.messages[0].type, 'warning');
});

test('should only warn with svg data uri', async () => {
  const css = `@font-face {
  src: url("https://example/dfds.woff2") format("woff2"),
       url('data:image/svg+xml;charset=utf-8,<svg></svg>') format("svg");
  }`;
  const result = await postcss(plugin()).process(css, { from: undefined });
  assert.is(result.messages.length, 0);
});

test(
  'should pass through links to svg files',
  passthroughCSS('h1{background:url(unicorn.svg)}')
);

test(
  'should skip non-SVG urls',
  passthroughCSS(`@font-face {
  src: url("../example/dfds.woff2") format("woff2"),
       url('data:image/svg+xml;charset=utf-8,<svg/>') format("svg");
  }`)
);

test(
  'should pass through relative links to svg files',
  passthroughCSS('h1{background:url(../unicorn.svg#part)}')
);

test(
  'should pass through URLs with SVG in parameters',
  passthroughCSS('h1{background:url(something.php?image=decor.svg)}')
);

test(
  'should encode hashes',
  processCSS(
    `h1{background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="32" viewBox="0 0 1200 320"> <path d="M137.189 140V17.17h-36.676L73.871 31.832z" fill="rgb(102,51,153)"/></svg>');}`,
    `h1{background-image: url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="32" viewBox="0 0 1200 320"><path d="M137.189 140V17.17h-36.676L73.871 31.832z" fill="%23639"/></svg>');}`
  )
);

test('should not crash on malformed urls when encoded', () => {
  const svg = encode(file(`${__dirname}/border.svg`, 'utf-8'));

  assert.not.throws(() => decode(svg));
});

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
test.run();
