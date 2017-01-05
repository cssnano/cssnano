import test from 'ava';
import processCss from './_processCss';

test(
    'should strip double quotes',
    processCss,
    'h1{background:url("cat.jpg")}',
    'h1{background:url(cat.jpg)}',
);

test(
    'should strip single quotes',
    processCss,
    'h1{background:url(\'cat.jpg\')}',
    'h1{background:url(cat.jpg)}',
);

test(
    'should escape special characters',
    processCss,
    'h1{background:url("http://website.com/assets)_test.png")}',
    'h1{background:url(http://website.com/assets\\)_test.png)}',
);

test(
    'should not escape more than one special character',
    processCss,
    'h1{background:url("http://website.com/assets_(test).png")}',
    'h1{background:url("http://website.com/assets_(test).png")}',
);

test(
    'should remove the default port',
    processCss,
    'h1{background:url(http://website.com:80/image.png)}',
    'h1{background:url(http://website.com/image.png)}',
);

test(
    'should not remove the fragment',
    processCss,
    'h1{background:url(test.svg#icon)}',
    'h1{background:url(test.svg#icon)}',
);

test(
    'should not remove the fragment in absolute urls',
    processCss,
    'h1{background:url(http://website.com/test.svg#icon)}',
    'h1{background:url(http://website.com/test.svg#icon)}',
);

test(
    'should normalize directory traversal',
    processCss,
    'h1{background:url(http://website.com/assets/css/../font/t.eot)}',
    'h1{background:url(http://website.com/assets/font/t.eot)}',
);

test(
    'should normalize directory traversal in relative urls',
    processCss,
    'h1{background:url(css/../font/t.eot)}',
    'h1{background:url(font/t.eot)}',
);

test(
    'should trim current directory indicator in relative urls',
    processCss,
    'h1{background:url(./images/cat.png)}',
    'h1{background:url(images/cat.png)}',
);

test(
    'should do the above tests, stripping quotes',
    processCss,
    'h1{background:url("./css/../font/t.eot")}',
    'h1{background:url(font/t.eot)}',
);

test(
    'should normalize urls with special characters',
    processCss,
    'h1{background:url("http://website.com/test/../(images)/1.png")}',
    'h1{background:url("http://website.com/(images)/1.png")}',
);

test(
    'should normalize relative urls with special characters',
    processCss,
    'h1{background:url("test/../(images)/1.png")}',
    'h1{background:url("(images)/1.png")}',
);

test(
    'should minimise whitespace inside the url function',
    processCss,
    'h1{background:url(               test.png           )}',
    'h1{background:url(test.png)}',
);

test(
    'should minimise whitespace inside the url string',
    processCss,
    'h1{background:url("               test.png      ")}',
    'h1{background:url(test.png)}',
);

test(
    'should minimise whitespace with special characters',
    processCss,
    'h1{background:url("           test (2015).png     ")}',
    'h1{background:url("test (2015).png")}',
);

test(
    'should join multiline url functions',
    processCss,
    'h1{background:url("some really long string \\\nspanning multiple lines")}',
    'h1{background:url("some really long string spanning multiple lines")}',
);

test(
    'should process multiple backgrounds',
    processCss,
    'h1{background:url(   "./test/../foo/bar.jpg"  ), url("http://website.com/img.jpg")}',
    'h1{background:url(foo/bar.jpg),url(http://website.com/img.jpg)}',
);

test(
    'should not mangle data urls',
    processCss,
    '.has-svg:before{content:url("data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="-0.5 0 20 15"><rect fill="white" stroke="none" transform="rotate(45 4.0033 8.87436)" height="5" width="6.32304" y="6.37436" x="0.84178"></rect><rect fill="white" stroke="none" transform="rotate(45 11.1776 7.7066)" width="5" height="16.79756" y="-0.69218" x="8.67764"></rect></svg>")}',
    '.has-svg:before{content:url("data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="-0.5 0 20 15"><rect fill="#fff" stroke="none" transform="rotate(45 4.0033 8.87436)" height="5" width="6.32304" y="6.37436" x="0.84178"></rect><rect fill="#fff" stroke="none" transform="rotate(45 11.1776 7.7066)" width="5" height="16.79756" y="-0.69218" x="8.67764"></rect></svg>")}',
);

test(
    'should optimise @namespace urls',
    processCss,
    '@namespace islands url("http://bar.yandex.ru/ui/islands");',
    '@namespace islands "http://bar.yandex.ru/ui/islands";',
    {discardUnused: {namespace: false}},
);

test(
    'should not normalize @document urls',
    processCss,
    '@document url(http://www.w3.org/),url-prefix(http://www.w3.org/Style/){body{font-size:2em}}',
    '@document url(http://www.w3.org/),url-prefix(http://www.w3.org/Style/){body{font-size:2em}}',
);
