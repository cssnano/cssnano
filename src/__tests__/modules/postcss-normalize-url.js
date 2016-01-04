module.exports.name = 'cssnano/postcss-normalize-url';
module.exports.tests = [{
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
    expected: 'h1{background:url(foo/bar.jpg),url(http://website.com/img.jpg)}'
}, {
    message: 'should not mangle data urls',
    fixture: '.has-svg:before{content:url("data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="-0.5 0 20 15"><rect fill="white" stroke="none" transform="rotate(45 4.0033 8.87436)" height="5" width="6.32304" y="6.37436" x="0.84178"></rect><rect fill="white" stroke="none" transform="rotate(45 11.1776 7.7066)" width="5" height="16.79756" y="-0.69218" x="8.67764"></rect></svg>")}',
    expected: '.has-svg:before{content:url("data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="-0.5 0 20 15"><rect fill="#fff" stroke="none" transform="rotate(45 4.0033 8.87436)" height="5" width="6.32304" y="6.37436" x="0.84178"></rect><rect fill="#fff" stroke="none" transform="rotate(45 11.1776 7.7066)" width="5" height="16.79756" y="-0.69218" x="8.67764"></rect></svg>")}',
}, {
    message: 'should optimise @namespace urls',
    fixture: '@namespace islands url("http://bar.yandex.ru/ui/islands");',
    expected: '@namespace islands "http://bar.yandex.ru/ui/islands";',
    options: {discardUnused: {namespace: false}}
}, {
    message: 'should optimise @namespace urls (2)',
    fixture: '@namespace test url("http://bar.com:80/test")',
    expected: '@namespace test "http://bar.com/test"',
    options: {discardUnused: {namespace: false}}
}, {
    message: 'should optimise @namespace urls (3)',
    fixture: '@namespace test \'http://test.com/foo/../bar\';',
    expected: '@namespace test \'http://test.com/bar\';',
    options: {discardUnused: {namespace: false}}
}, {
    message: 'should optimise @namespace urls (4)',
    fixture: '@namespace test url("         http://bar.com:80/test        ");',
    expected: '@namespace test "http://bar.com/test";',
    options: {discardUnused: {namespace: false}}
}, {
    message: 'should not normalize @document urls',
    fixture: '@document url(http://www.w3.org/),url-prefix(http://www.w3.org/Style/){body{font-size:2em}}',
    expected: '@document url(http://www.w3.org/),url-prefix(http://www.w3.org/Style/){body{font-size:2em}}'
}];
