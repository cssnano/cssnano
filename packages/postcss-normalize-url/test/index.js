'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should strip double quotes',
  processCSS('h1{background:url("cat.jpg")}', 'h1{background:url(cat.jpg)}')
);

test(
  'should strip single quotes',
  processCSS("h1{background:url('cat.jpg')}", 'h1{background:url(cat.jpg)}')
);

test(
  'should strip double quotes uppercase URL',
  processCSS('h1{background:URL("cat.jpg")}', 'h1{background:URL(cat.jpg)}')
);

test(
  'should escape special characters',
  processCSS(
    'h1{background:url("http://website.com/assets)_test.png")}',
    'h1{background:url(http://website.com/assets\\)_test.png)}'
  )
);

test(
  'should not escape more than one special character',
  passthroughCSS('h1{background:url("http://website.com/assets_(test).png")}')
);

test(
  'should remove the default port',
  processCSS(
    'h1{background:url(http://website.com:80/image.png)}',
    'h1{background:url(http://website.com/image.png)}'
  )
);

test(
  'should not remove the fragment',
  passthroughCSS('h1{background:url(test.svg#icon)}')
);

test(
  'should not remove the fragment in absolute urls',
  passthroughCSS('h1{background:url(http://website.com/test.svg#icon)}')
);

test(
  'should normalize directory traversal',
  processCSS(
    'h1{background:url(http://website.com/assets/css/../font/t.eot)}',
    'h1{background:url(http://website.com/assets/font/t.eot)}'
  )
);

test(
  'should normalize directory traversal in relative urls',
  processCSS(
    'h1{background:url(css/../font/t.eot)}',
    'h1{background:url(font/t.eot)}'
  )
);

test(
  'should trim current directory indicator in relative urls',
  processCSS(
    'h1{background:url(./images/cat.png)}',
    'h1{background:url(images/cat.png)}'
  )
);

test(
  'should do the above tests, stripping quotes',
  processCSS(
    'h1{background:url("./css/../font/t.eot")}',
    'h1{background:url(font/t.eot)}'
  )
);

test(
  'should normalize urls with special characters',
  processCSS(
    'h1{background:url("http://website.com/test/../(images)/1.png")}',
    'h1{background:url("http://website.com/(images)/1.png")}'
  )
);

test(
  'should normalize relative urls with special characters',
  processCSS(
    'h1{background:url("test/../(images)/1.png")}',
    'h1{background:url("(images)/1.png")}'
  )
);

test(
  'should minimise whitespace inside the url function',
  processCSS(
    'h1{background:url(               test.png           )}',
    'h1{background:url(test.png)}'
  )
);

test(
  'should minimise whitespace inside the url function (2)',
  processCSS('h1{background:url(               )}', 'h1{background:url()}')
);

test(
  'should minimise whitespace inside the url string',
  processCSS(
    'h1{background:url("               test.png      ")}',
    'h1{background:url(test.png)}'
  )
);

test(
  'should minimise whitespace inside the url string (2)',
  processCSS('h1{background:url("               ")}', 'h1{background:url()}')
);

test(
  'should minimise whitespace with special characters',
  processCSS(
    'h1{background:url("           test (2015).png     ")}',
    'h1{background:url("test (2015).png")}'
  )
);

test(
  'should join multiline url functions',
  processCSS(
    'h1{background:url("some really long string \\\nspanning multiple lines")}',
    'h1{background:url("some really long string spanning multiple lines")}'
  )
);

test(
  'should process multiple backgrounds',
  processCSS(
    'h1{background:url(   "./test/../foo/bar.jpg"  ), url("http://website.com/img.jpg")}',
    'h1{background:url(foo/bar.jpg), url(http://website.com/img.jpg)}'
  )
);

test(
  'should not mangle chrome extension urls',
  processCSS(
    "h1{background-image:url('chrome-extension://__MSG_@@extension_id__/someFile.png')}",
    'h1{background-image:url(chrome-extension://__MSG_@@extension_id__/someFile.png)}'
  )
);

test(
  'should not mangle mozila extension urls',
  processCSS(
    "h1{background-image:url('moz-extension://__MSG_@@extension_id__/someFile.png')}",
    'h1{background-image:url(moz-extension://__MSG_@@extension_id__/someFile.png)}'
  )
);

test(
  'should not mangle other extension urls',
  processCSS(
    "h1{background-image:url('other-other-extension://__MSG_@@extension_id__/someFile.png')}",
    'h1{background-image:url(other-other-extension://__MSG_@@extension_id__/someFile.png)}'
  )
);

test(
  'should not mangle data urls',
  passthroughCSS(
    '.has-svg:before{content:url("data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="-0.5 0 20 15"><rect fill="white" stroke="none" transform="rotate(45 4.0033 8.87436)" height="5" width="6.32304" y="6.37436" x="0.84178"></rect><rect fill="white" stroke="none" transform="rotate(45 11.1776 7.7066)" width="5" height="16.79756" y="-0.69218" x="8.67764"></rect></svg>")}'
  )
);

test(
  'should not mangle data urls (2)',
  passthroughCSS(
    '.has-svg:before{content:url("DATA:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="-0.5 0 20 15"><rect fill="white" stroke="none" transform="rotate(45 4.0033 8.87436)" height="5" width="6.32304" y="6.37436" x="0.84178"></rect><rect fill="white" stroke="none" transform="rotate(45 11.1776 7.7066)" width="5" height="16.79756" y="-0.69218" x="8.67764"></rect></svg>")}'
  )
);

test(
  'should not mangle empty data urls',
  passthroughCSS('.has-svg:before{content:url(data:,Hello%2C%20World!)}')
);

test(
  'should not mangle plain data urls',
  passthroughCSS(
    '.has-svg:before{content:url(data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3D)}'
  )
);

test(
  'should not mangle text/html data urls',
  passthroughCSS(
    '.has-svg:before{content:url(data:text/html,%3Ch1%3EHello%2C%20World!%3C%2Fh1%3E)}'
  )
);

test(
  'should not mangle text/html data urls (2)',
  passthroughCSS(
    '.has-svg:before{content:url("data:text/html,%3Ch1%3EHello%2C%20World!%3C%2Fh1%3E")}'
  )
);

test(
  'should not mangle embedded fonts',
  passthroughCSS(
    ".font:before{src:url(data:application/x-font-ttf;charset=utf-8;base64,AAEAAAALAIAAAwAwT1MvMg8SAscAAAC8AAAAYGNtYXAaVsyNAAABHAAAAFRnYXNwAAAAEAAAAXAAAAAIZ2x5ZryFoPwAAAF4AAAB3GhlYWQG2Pc9AAADVAAAADZoaGVhCB4EXgAAA4wAAAAkaG10eCC6AcMAAAOwAAAALGxvY2EBvgJWAAAD3AAAABhtYXhwABEAMgAAA/QAAAAgbmFtZVxlIn0AAAQUAAABknBvc3QAAwAAAAAFqAAAACAAAwOXAZAABQAAApkCzAAAAI8CmQLMAAAB6wAzAQkAAAAAAAAAAAAAAAAAAAABEAAAAAAAAAAAAAAAAAAAAABAAADmBgPA/8AAQAPAAEAAAAABAAAAAAAAAAAAAAAgAAAAAAADAAAAAwAAABwAAQADAAAAHAADAAEAAAAcAAQAOAAAAAoACAACAAIAAQAg5gb//f//AAAAAAAg5gD//f//AAH/4xoEAAMAAQAAAAAAAAAAAAAAAQAB//8ADwABAAAAAAAAAAAAAgAANzkBAAAAAAEAAAAAAAAAAAACAAA3OQEAAAAAAQAAAAAAAAAAAAIAADc5AQAAAAABABAAggP6AukABgAAEwkBJwkBBxAB9QH1j/6a/pqPAmD+IgHeif6qAVaJAAEA0f/PAzgDuAAGAAAJAjcJAScCsP4hAd+I/qsBVYgDuP4L/gyPAWUBZo8AAQDR/8oDOAOzAAYAAAUJAQcJARcBWgHe/iKJAVb+qok2AfUB9I/+m/6ajwABAA0AggP2AukABgAACQIXCQE3A/b+DP4LjwFmAWWPAQsB3v4iiQFW/qqJAAUAAP/ABAADwAAEAAgAFQAiAC8AABMzESMRAwkBIQEUBiMiJjU0NjMyFhURFAYjIiY1NDYzMhYVERQGIyImNTQ2MzIWFeyenuwBOwE7/YoEAEUxMUVFMTFFRTExRUUxMUVFMTFFRTExRQPA/OwDFP2K/nYBigIAMUVFMTFFRTH87DFFRTExRUUxAYoxRUUxMUVFMQABAAf/zgRfA7IABgAACQI3FwEXBF/9LP58ffgCSpkDLvygAX2J7wLNhAAAAAH//f/mAhMDmgAHAAAJAjcBFQEnAb3+QAHAVv5nAZlWA5r+Jv4mUQGyUgGyUQAAAAEAAAABAABWiO5BXw889QALBAAAAAAA0a7ZYAAAAADRrtlg//3/wARfA8AAAAAIAAIAAAAAAAAAAQAAA8D/wAAABJL//QAABF8AAQAAAAAAAAAAAAAAAAAAAAsEAAAAAAAAAAAAAAACAAAABAAAEAQAANEEAADRBAAADQQAAAAEkgAHAif//QAAAAAACgAUAB4ANABKAGAAdgDAANYA7gABAAAACwAwAAUAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAADgCuAAEAAAAAAAEACAAAAAEAAAAAAAIABwBpAAEAAAAAAAMACAA5AAEAAAAAAAQACAB+AAEAAAAAAAUACwAYAAEAAAAAAAYACABRAAEAAAAAAAoAGgCWAAMAAQQJAAEAEAAIAAMAAQQJAAIADgBwAAMAAQQJAAMAEABBAAMAAQQJAAQAEACGAAMAAQQJAAUAFgAjAAMAAQQJAAYAEABZAAMAAQQJAAoANACwYmV0MzY1VUkAYgBlAHQAMwA2ADUAVQBJVmVyc2lvbiAxLjAAVgBlAHIAcwBpAG8AbgAgADEALgAwYmV0MzY1VUkAYgBlAHQAMwA2ADUAVQBJYmV0MzY1VUkAYgBlAHQAMwA2ADUAVQBJUmVndWxhcgBSAGUAZwB1AGwAYQByYmV0MzY1VUkAYgBlAHQAMwA2ADUAVQBJRm9udCBnZW5lcmF0ZWQgYnkgSWNvTW9vbi4ARgBvAG4AdAAgAGcAZQBuAGUAcgBhAHQAZQBkACAAYgB5ACAASQBjAG8ATQBvAG8AbgAuAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==) format('truetype')}"
  )
);

test(
  'should not mangle embedded fonts (2)',
  passthroughCSS(
    ".font:before{src:url(data:font/truetype;charset=utf-8;base64,AAEAAAALAIAAAwAwT1MvMg8RC0oAAAC8AAAAYGNtYXAAMwCZAAABHAAAAExnYXNwAAAAEAAAAWgAAAAIZ2x5ZgMDpbEAAAFwAAAAPGhlYWQErmD9AAABrAAAADZoaGVhA8IDxQAAAeQAAAAkaG10eAYAAAAAAAIIAAAAEGxvY2EAKAAUAAACGAAAAAptYXhwAAYABQAAAiQAAAAgbmFtZZlKCfsAAAJEAAABhnBvc3QAAwAAAAADzAAAACAAAwIAAZAABQAAApkCzAAAAI8CmQLMAAAB6wAzAQkAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAABAAAAAIAPA/8AAQAPAAEAAAAABAAAAAAAAAAAAAAAgAAAAAAADAAAAAwAAABwAAQADAAAAHAADAAEAAAAcAAQAMAAAAAgACAACAAAAAQAg//3//wAAAAAAIP/9//8AAf/jAAMAAQAAAAAAAAAAAAEAAf//AA8AAQAAAAAAAAAAAAIAADc5AQAAAAABAAAAAAAAAAAAAgAANzkBAAAAAAEAAAAAAAAAAAACAAA3OQEAAAAAAQAAAAEAAMnP4PlfDzz1AAsEAAAAAADSyBAAAAAAANLIEAAAAAAAAAAAAAAAAAgAAgAAAAAAAAABAAADwP/AAAAEAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAABAQAAAAAAAAAAAAAAAIAAAAAAAAAAAoAFAAeAAAAAQAAAAQAAwABAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAA4ArgABAAAAAAABAAcAAAABAAAAAAACAAcAYAABAAAAAAADAAcANgABAAAAAAAEAAcAdQABAAAAAAAFAAsAFQABAAAAAAAGAAcASwABAAAAAAAKABoAigADAAEECQABAA4ABwADAAEECQACAA4AZwADAAEECQADAA4APQADAAEECQAEAA4AfAADAAEECQAFABYAIAADAAEECQAGAA4AUgADAAEECQAKADQApGljb21vb24AaQBjAG8AbQBvAG8AblZlcnNpb24gMS4wAFYAZQByAHMAaQBvAG4AIAAxAC4AMGljb21vb24AaQBjAG8AbQBvAG8Abmljb21vb24AaQBjAG8AbQBvAG8AblJlZ3VsYXIAUgBlAGcAdQBsAGEAcmljb21vb24AaQBjAG8AbQBvAG8AbkZvbnQgZ2VuZXJhdGVkIGJ5IEljb01vb24uAEYAbwBuAHQAIABnAGUAbgBlAHIAYQB0AGUAZAAgAGIAeQAgAEkAYwBvAE0AbwBvAG4ALgAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=') format('truetype')}"
  )
);

test(
  'should optimise @namespace urls',
  processCSS(
    '@namespace islands url(" http://bar.yandex.ru/ui/islands");',
    '@namespace islands "http://bar.yandex.ru/ui/islands";'
  )
);

test(
  'should optimise @namespace urls (2)',
  processCSS(
    '@namespace islands url(http://bar.yandex.ru/ui/islands );',
    '@namespace islands "http://bar.yandex.ru/ui/islands";'
  )
);

test(
  'should optimise @namespace urls (3)',
  processCSS(
    '@namespace islands " http://bar.yandex.ru/ui/islands ";',
    '@namespace islands "http://bar.yandex.ru/ui/islands";'
  )
);

test(
  'should optimise @namespace urls (4)',
  processCSS(
    '@NAMESPACE islands " http://bar.yandex.ru/ui/islands ";',
    '@NAMESPACE islands "http://bar.yandex.ru/ui/islands";'
  )
);

test(
  'should not normalize @document urls',
  passthroughCSS(
    '@document url(http://www.w3.org/),url-prefix(http://www.w3.org/Style/){body{font-size:2em}}'
  )
);

test(
  'should handle protocol relative urls',
  processCSS(
    'h1{background:url(//website.com:80/image.png)}',
    'h1{background:url(//website.com/image.png)}'
  )
);

test(
  'should preserve paths in parameters',
  passthroughCSS(
    'background: url(https://ss0.example.com/70cFuh_Q1Yn/it/u=5088,2842&fm=26&gp=0.jpg?imageView2/1/w/750/h/1334)'
  )
);

test(
  "should pass through when it doesn't find a url function",
  passthroughCSS('h1{color:black;font-weight:bold}')
);

test(
  'should pass through non-url empty functions',
  passthroughCSS('h1{shape-outside:circle()}')
);

test('should pass through empty url', passthroughCSS('h1{background:url()}'));

test(
  'should pass through invalid url',
  passthroughCSS('h1{background:url(http://)}')
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

test.run();
