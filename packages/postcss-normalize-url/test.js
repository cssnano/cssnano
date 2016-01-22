'use strict';

var test = require('tape');
var postcss = require('postcss');
var plugin = require('./');
var name = require('./package.json').name;

var tests = [{
    message: 'should strip double quotes',
    fixture: 'h1{background:url("cat.jpg")}',
    expected: 'h1{background:url(cat.jpg)}'
}, {
    message: 'should strip single quotes',
    fixture: 'h1{background:url(\'cat.jpg\')}',
    expected: 'h1{background:url(cat.jpg)}'
}, {
    message: 'should escape special characters',
    fixture: 'h1{background:url("http://website.com/assets)_test.png")}',
    expected: 'h1{background:url(http://website.com/assets\\)_test.png)}'
}, {
    message: 'should not escape more than one special character',
    fixture: 'h1{background:url("http://website.com/assets_(test).png")}',
    expected: 'h1{background:url("http://website.com/assets_(test).png")}'
}, {
    message: 'should remove the default port',
    fixture: 'h1{background:url(http://website.com:80/image.png)}',
    expected: 'h1{background:url(http://website.com/image.png)}'
}, {
    message: 'should not remove the fragment',
    fixture: 'h1{background:url(test.svg#icon)}',
    expected: 'h1{background:url(test.svg#icon)}'
}, {
    message: 'should not remove the fragment in absolute urls',
    fixture: 'h1{background:url(http://website.com/test.svg#icon)}',
    expected: 'h1{background:url(http://website.com/test.svg#icon)}'
}, {
    message: 'should normalize directory traversal',
    fixture: 'h1{background:url(http://website.com/assets/css/../font/t.eot)}',
    expected: 'h1{background:url(http://website.com/assets/font/t.eot)}'
}, {
    message: 'should normalize directory traversal in relative urls',
    fixture: 'h1{background:url(css/../font/t.eot)}',
    expected: 'h1{background:url(font/t.eot)}'
}, {
    message: 'should trim current directory indicator in relative urls',
    fixture: 'h1{background:url(./images/cat.png)}',
    expected: 'h1{background:url(images/cat.png)}'
}, {
    message: 'should do the above tests, stripping quotes',
    fixture: 'h1{background:url("./css/../font/t.eot")}',
    expected: 'h1{background:url(font/t.eot)}'
}, {
    message: 'should normalize urls with special characters',
    fixture: 'h1{background:url("http://website.com/test/../(images)/1.png")}',
    expected: 'h1{background:url("http://website.com/(images)/1.png")}'
}, {
    message: 'should normalize relative urls with special characters',
    fixture: 'h1{background:url("test/../(images)/1.png")}',
    expected: 'h1{background:url("(images)/1.png")}'
}, {
    message: 'should minimise whitespace inside the url function',
    fixture: 'h1{background:url(               test.png           )}',
    expected: 'h1{background:url(test.png)}'
}, {
    message: 'should minimise whitespace inside the url string',
    fixture: 'h1{background:url("               test.png      ")}',
    expected: 'h1{background:url(test.png)}'
}, {
    message: 'should minimise whitespace with special characters',
    fixture: 'h1{background:url("           test (2015).png     ")}',
    expected: 'h1{background:url("test (2015).png")}'
}, {
    message: 'should join multiline url functions',
    fixture: 'h1{background:url("some really long string \\\nspanning multiple lines")}',
    expected: 'h1{background:url("some really long string spanning multiple lines")}'
}, {
    message: 'should process multiple backgrounds',
    fixture: 'h1{background:url(   "./test/../foo/bar.jpg"  ), url("http://website.com/img.jpg")}',
    expected: 'h1{background:url(foo/bar.jpg), url(http://website.com/img.jpg)}'
}, {
    message: 'should not mangle chrome extension urls',
    fixture: 'h1{background-image:url(\'chrome-extension://__MSG_@@extension_id__/someFile.png\')}',
    expected: 'h1{background-image:url(chrome-extension://__MSG_@@extension_id__/someFile.png)}'
}, {
    message: 'should not mangle data urls',
    fixture: '.has-svg:before{content:url("data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="-0.5 0 20 15"><rect fill="white" stroke="none" transform="rotate(45 4.0033 8.87436)" height="5" width="6.32304" y="6.37436" x="0.84178"></rect><rect fill="white" stroke="none" transform="rotate(45 11.1776 7.7066)" width="5" height="16.79756" y="-0.69218" x="8.67764"></rect></svg>")}',
    expected: '.has-svg:before{content:url("data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="-0.5 0 20 15"><rect fill="white" stroke="none" transform="rotate(45 4.0033 8.87436)" height="5" width="6.32304" y="6.37436" x="0.84178"></rect><rect fill="white" stroke="none" transform="rotate(45 11.1776 7.7066)" width="5" height="16.79756" y="-0.69218" x="8.67764"></rect></svg>")}',
}, {
    message: 'should not mangle embedded fonts',
    fixture: '.font:before{src:url(data:application/x-font-ttf;charset=utf-8;base64,AAEAAAALAIAAAwAwT1MvMg8SAscAAAC8AAAAYGNtYXAaVsyNAAABHAAAAFRnYXNwAAAAEAAAAXAAAAAIZ2x5ZryFoPwAAAF4AAAB3GhlYWQG2Pc9AAADVAAAADZoaGVhCB4EXgAAA4wAAAAkaG10eCC6AcMAAAOwAAAALGxvY2EBvgJWAAAD3AAAABhtYXhwABEAMgAAA/QAAAAgbmFtZVxlIn0AAAQUAAABknBvc3QAAwAAAAAFqAAAACAAAwOXAZAABQAAApkCzAAAAI8CmQLMAAAB6wAzAQkAAAAAAAAAAAAAAAAAAAABEAAAAAAAAAAAAAAAAAAAAABAAADmBgPA/8AAQAPAAEAAAAABAAAAAAAAAAAAAAAgAAAAAAADAAAAAwAAABwAAQADAAAAHAADAAEAAAAcAAQAOAAAAAoACAACAAIAAQAg5gb//f//AAAAAAAg5gD//f//AAH/4xoEAAMAAQAAAAAAAAAAAAAAAQAB//8ADwABAAAAAAAAAAAAAgAANzkBAAAAAAEAAAAAAAAAAAACAAA3OQEAAAAAAQAAAAAAAAAAAAIAADc5AQAAAAABABAAggP6AukABgAAEwkBJwkBBxAB9QH1j/6a/pqPAmD+IgHeif6qAVaJAAEA0f/PAzgDuAAGAAAJAjcJAScCsP4hAd+I/qsBVYgDuP4L/gyPAWUBZo8AAQDR/8oDOAOzAAYAAAUJAQcJARcBWgHe/iKJAVb+qok2AfUB9I/+m/6ajwABAA0AggP2AukABgAACQIXCQE3A/b+DP4LjwFmAWWPAQsB3v4iiQFW/qqJAAUAAP/ABAADwAAEAAgAFQAiAC8AABMzESMRAwkBIQEUBiMiJjU0NjMyFhURFAYjIiY1NDYzMhYVERQGIyImNTQ2MzIWFeyenuwBOwE7/YoEAEUxMUVFMTFFRTExRUUxMUVFMTFFRTExRQPA/OwDFP2K/nYBigIAMUVFMTFFRTH87DFFRTExRUUxAYoxRUUxMUVFMQABAAf/zgRfA7IABgAACQI3FwEXBF/9LP58ffgCSpkDLvygAX2J7wLNhAAAAAH//f/mAhMDmgAHAAAJAjcBFQEnAb3+QAHAVv5nAZlWA5r+Jv4mUQGyUgGyUQAAAAEAAAABAABWiO5BXw889QALBAAAAAAA0a7ZYAAAAADRrtlg//3/wARfA8AAAAAIAAIAAAAAAAAAAQAAA8D/wAAABJL//QAABF8AAQAAAAAAAAAAAAAAAAAAAAsEAAAAAAAAAAAAAAACAAAABAAAEAQAANEEAADRBAAADQQAAAAEkgAHAif//QAAAAAACgAUAB4ANABKAGAAdgDAANYA7gABAAAACwAwAAUAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAADgCuAAEAAAAAAAEACAAAAAEAAAAAAAIABwBpAAEAAAAAAAMACAA5AAEAAAAAAAQACAB+AAEAAAAAAAUACwAYAAEAAAAAAAYACABRAAEAAAAAAAoAGgCWAAMAAQQJAAEAEAAIAAMAAQQJAAIADgBwAAMAAQQJAAMAEABBAAMAAQQJAAQAEACGAAMAAQQJAAUAFgAjAAMAAQQJAAYAEABZAAMAAQQJAAoANACwYmV0MzY1VUkAYgBlAHQAMwA2ADUAVQBJVmVyc2lvbiAxLjAAVgBlAHIAcwBpAG8AbgAgADEALgAwYmV0MzY1VUkAYgBlAHQAMwA2ADUAVQBJYmV0MzY1VUkAYgBlAHQAMwA2ADUAVQBJUmVndWxhcgBSAGUAZwB1AGwAYQByYmV0MzY1VUkAYgBlAHQAMwA2ADUAVQBJRm9udCBnZW5lcmF0ZWQgYnkgSWNvTW9vbi4ARgBvAG4AdAAgAGcAZQBuAGUAcgBhAHQAZQBkACAAYgB5ACAASQBjAG8ATQBvAG8AbgAuAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==) format(\'truetype\')}',
    expected: '.font:before{src:url(data:application/x-font-ttf;charset=utf-8;base64,AAEAAAALAIAAAwAwT1MvMg8SAscAAAC8AAAAYGNtYXAaVsyNAAABHAAAAFRnYXNwAAAAEAAAAXAAAAAIZ2x5ZryFoPwAAAF4AAAB3GhlYWQG2Pc9AAADVAAAADZoaGVhCB4EXgAAA4wAAAAkaG10eCC6AcMAAAOwAAAALGxvY2EBvgJWAAAD3AAAABhtYXhwABEAMgAAA/QAAAAgbmFtZVxlIn0AAAQUAAABknBvc3QAAwAAAAAFqAAAACAAAwOXAZAABQAAApkCzAAAAI8CmQLMAAAB6wAzAQkAAAAAAAAAAAAAAAAAAAABEAAAAAAAAAAAAAAAAAAAAABAAADmBgPA/8AAQAPAAEAAAAABAAAAAAAAAAAAAAAgAAAAAAADAAAAAwAAABwAAQADAAAAHAADAAEAAAAcAAQAOAAAAAoACAACAAIAAQAg5gb//f//AAAAAAAg5gD//f//AAH/4xoEAAMAAQAAAAAAAAAAAAAAAQAB//8ADwABAAAAAAAAAAAAAgAANzkBAAAAAAEAAAAAAAAAAAACAAA3OQEAAAAAAQAAAAAAAAAAAAIAADc5AQAAAAABABAAggP6AukABgAAEwkBJwkBBxAB9QH1j/6a/pqPAmD+IgHeif6qAVaJAAEA0f/PAzgDuAAGAAAJAjcJAScCsP4hAd+I/qsBVYgDuP4L/gyPAWUBZo8AAQDR/8oDOAOzAAYAAAUJAQcJARcBWgHe/iKJAVb+qok2AfUB9I/+m/6ajwABAA0AggP2AukABgAACQIXCQE3A/b+DP4LjwFmAWWPAQsB3v4iiQFW/qqJAAUAAP/ABAADwAAEAAgAFQAiAC8AABMzESMRAwkBIQEUBiMiJjU0NjMyFhURFAYjIiY1NDYzMhYVERQGIyImNTQ2MzIWFeyenuwBOwE7/YoEAEUxMUVFMTFFRTExRUUxMUVFMTFFRTExRQPA/OwDFP2K/nYBigIAMUVFMTFFRTH87DFFRTExRUUxAYoxRUUxMUVFMQABAAf/zgRfA7IABgAACQI3FwEXBF/9LP58ffgCSpkDLvygAX2J7wLNhAAAAAH//f/mAhMDmgAHAAAJAjcBFQEnAb3+QAHAVv5nAZlWA5r+Jv4mUQGyUgGyUQAAAAEAAAABAABWiO5BXw889QALBAAAAAAA0a7ZYAAAAADRrtlg//3/wARfA8AAAAAIAAIAAAAAAAAAAQAAA8D/wAAABJL//QAABF8AAQAAAAAAAAAAAAAAAAAAAAsEAAAAAAAAAAAAAAACAAAABAAAEAQAANEEAADRBAAADQQAAAAEkgAHAif//QAAAAAACgAUAB4ANABKAGAAdgDAANYA7gABAAAACwAwAAUAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAADgCuAAEAAAAAAAEACAAAAAEAAAAAAAIABwBpAAEAAAAAAAMACAA5AAEAAAAAAAQACAB+AAEAAAAAAAUACwAYAAEAAAAAAAYACABRAAEAAAAAAAoAGgCWAAMAAQQJAAEAEAAIAAMAAQQJAAIADgBwAAMAAQQJAAMAEABBAAMAAQQJAAQAEACGAAMAAQQJAAUAFgAjAAMAAQQJAAYAEABZAAMAAQQJAAoANACwYmV0MzY1VUkAYgBlAHQAMwA2ADUAVQBJVmVyc2lvbiAxLjAAVgBlAHIAcwBpAG8AbgAgADEALgAwYmV0MzY1VUkAYgBlAHQAMwA2ADUAVQBJYmV0MzY1VUkAYgBlAHQAMwA2ADUAVQBJUmVndWxhcgBSAGUAZwB1AGwAYQByYmV0MzY1VUkAYgBlAHQAMwA2ADUAVQBJRm9udCBnZW5lcmF0ZWQgYnkgSWNvTW9vbi4ARgBvAG4AdAAgAGcAZQBuAGUAcgBhAHQAZQBkACAAYgB5ACAASQBjAG8ATQBvAG8AbgAuAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==) format(\'truetype\')}'
}, {
    message: 'should not mangle embedded fonts (2)',
    fixture: '.font:before{src:url(data:font/truetype;charset=utf-8;base64,AAEAAAALAIAAAwAwT1MvMg8RC0oAAAC8AAAAYGNtYXAAMwCZAAABHAAAAExnYXNwAAAAEAAAAWgAAAAIZ2x5ZgMDpbEAAAFwAAAAPGhlYWQErmD9AAABrAAAADZoaGVhA8IDxQAAAeQAAAAkaG10eAYAAAAAAAIIAAAAEGxvY2EAKAAUAAACGAAAAAptYXhwAAYABQAAAiQAAAAgbmFtZZlKCfsAAAJEAAABhnBvc3QAAwAAAAADzAAAACAAAwIAAZAABQAAApkCzAAAAI8CmQLMAAAB6wAzAQkAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAABAAAAAIAPA/8AAQAPAAEAAAAABAAAAAAAAAAAAAAAgAAAAAAADAAAAAwAAABwAAQADAAAAHAADAAEAAAAcAAQAMAAAAAgACAACAAAAAQAg//3//wAAAAAAIP/9//8AAf/jAAMAAQAAAAAAAAAAAAEAAf//AA8AAQAAAAAAAAAAAAIAADc5AQAAAAABAAAAAAAAAAAAAgAANzkBAAAAAAEAAAAAAAAAAAACAAA3OQEAAAAAAQAAAAEAAMnP4PlfDzz1AAsEAAAAAADSyBAAAAAAANLIEAAAAAAAAAAAAAAAAAgAAgAAAAAAAAABAAADwP/AAAAEAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAABAQAAAAAAAAAAAAAAAIAAAAAAAAAAAoAFAAeAAAAAQAAAAQAAwABAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAA4ArgABAAAAAAABAAcAAAABAAAAAAACAAcAYAABAAAAAAADAAcANgABAAAAAAAEAAcAdQABAAAAAAAFAAsAFQABAAAAAAAGAAcASwABAAAAAAAKABoAigADAAEECQABAA4ABwADAAEECQACAA4AZwADAAEECQADAA4APQADAAEECQAEAA4AfAADAAEECQAFABYAIAADAAEECQAGAA4AUgADAAEECQAKADQApGljb21vb24AaQBjAG8AbQBvAG8AblZlcnNpb24gMS4wAFYAZQByAHMAaQBvAG4AIAAxAC4AMGljb21vb24AaQBjAG8AbQBvAG8Abmljb21vb24AaQBjAG8AbQBvAG8AblJlZ3VsYXIAUgBlAGcAdQBsAGEAcmljb21vb24AaQBjAG8AbQBvAG8AbkZvbnQgZ2VuZXJhdGVkIGJ5IEljb01vb24uAEYAbwBuAHQAIABnAGUAbgBlAHIAYQB0AGUAZAAgAGIAeQAgAEkAYwBvAE0AbwBvAG4ALgAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=\') format(\'truetype\');) }',
    expected: '.font:before{src:url(data:font/truetype;charset=utf-8;base64,AAEAAAALAIAAAwAwT1MvMg8RC0oAAAC8AAAAYGNtYXAAMwCZAAABHAAAAExnYXNwAAAAEAAAAWgAAAAIZ2x5ZgMDpbEAAAFwAAAAPGhlYWQErmD9AAABrAAAADZoaGVhA8IDxQAAAeQAAAAkaG10eAYAAAAAAAIIAAAAEGxvY2EAKAAUAAACGAAAAAptYXhwAAYABQAAAiQAAAAgbmFtZZlKCfsAAAJEAAABhnBvc3QAAwAAAAADzAAAACAAAwIAAZAABQAAApkCzAAAAI8CmQLMAAAB6wAzAQkAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAABAAAAAIAPA/8AAQAPAAEAAAAABAAAAAAAAAAAAAAAgAAAAAAADAAAAAwAAABwAAQADAAAAHAADAAEAAAAcAAQAMAAAAAgACAACAAAAAQAg//3//wAAAAAAIP/9//8AAf/jAAMAAQAAAAAAAAAAAAEAAf//AA8AAQAAAAAAAAAAAAIAADc5AQAAAAABAAAAAAAAAAAAAgAANzkBAAAAAAEAAAAAAAAAAAACAAA3OQEAAAAAAQAAAAEAAMnP4PlfDzz1AAsEAAAAAADSyBAAAAAAANLIEAAAAAAAAAAAAAAAAAgAAgAAAAAAAAABAAADwP/AAAAEAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAABAQAAAAAAAAAAAAAAAIAAAAAAAAAAAoAFAAeAAAAAQAAAAQAAwABAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAA4ArgABAAAAAAABAAcAAAABAAAAAAACAAcAYAABAAAAAAADAAcANgABAAAAAAAEAAcAdQABAAAAAAAFAAsAFQABAAAAAAAGAAcASwABAAAAAAAKABoAigADAAEECQABAA4ABwADAAEECQACAA4AZwADAAEECQADAA4APQADAAEECQAEAA4AfAADAAEECQAFABYAIAADAAEECQAGAA4AUgADAAEECQAKADQApGljb21vb24AaQBjAG8AbQBvAG8AblZlcnNpb24gMS4wAFYAZQByAHMAaQBvAG4AIAAxAC4AMGljb21vb24AaQBjAG8AbQBvAG8Abmljb21vb24AaQBjAG8AbQBvAG8AblJlZ3VsYXIAUgBlAGcAdQBsAGEAcmljb21vb24AaQBjAG8AbQBvAG8AbkZvbnQgZ2VuZXJhdGVkIGJ5IEljb01vb24uAEYAbwBuAHQAIABnAGUAbgBlAHIAYQB0AGUAZAAgAGIAeQAgAEkAYwBvAE0AbwBvAG4ALgAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=\') format(\'truetype\');) }'
}, {
    message: 'should optimise @namespace urls',
    fixture: '@namespace islands url(" http://bar.yandex.ru/ui/islands");',
    expected: '@namespace islands "http://bar.yandex.ru/ui/islands";'
}, {
    message: 'should optimise @namespace urls',
    fixture: '@namespace islands url(http://bar.yandex.ru/ui/islands );',
    expected: '@namespace islands "http://bar.yandex.ru/ui/islands";'
}, {
    message: 'should optimise @namespace urls (2)',
    fixture: '@namespace test url( "http://bar.com:80/test" )',
    expected: '@namespace test "http://bar.com/test"'
}, {
    message: 'should optimise @namespace urls (3)',
    fixture: '@namespace test \'http://test.com/foo/../bar\';',
    expected: '@namespace test \'http://test.com/bar\';'
}, {
    message: 'should optimise @namespace urls (4)',
    fixture: '@namespace test url("         http://bar.com:80/test        ");',
    expected: '@namespace test "http://bar.com/test";'
}, {
    message: 'should not normalize @document urls',
    fixture: '@document url(http://www.w3.org/),url-prefix(http://www.w3.org/Style/){body{font-size:2em}}',
    expected: '@document url(http://www.w3.org/),url-prefix(http://www.w3.org/Style/){body{font-size:2em}}'
}, {
    message: 'should handle protocol relative urls',
    fixture: 'h1{background:url(//website.com:80/image.png)}',
    expected: 'h1{background:url(//website.com/image.png)}'
}, {
    message: 'should pass through when it doesn\'t find a url function',
    fixture: 'h1{color:black;font-weight:bold}',
    expected: 'h1{color:black;font-weight:bold}'
}, {
    message: 'should process non-url empty functions',
    fixture: 'h1{shape-outside: circle()}',
    expected: 'h1{shape-outside: circle()}'
}];

test(name, function (t) {
    t.plan(tests.length);

    tests.forEach(function (test) {
        t.equal(plugin.process(test.fixture).css, test.expected, test.message);
    });
});

test('should use the postcss plugin api', function (t) {
    t.plan(2);
    t.ok(plugin().postcssVersion, 'should be able to access version');
    t.equal(plugin().postcssPlugin, name, 'should be able to access name');
});
