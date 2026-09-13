import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Strip', () => {
  test(
    'should strip double quotes',
    processCSS('h1{background:url("cat.jpg")}', 'h1{background:url(cat.jpg)}')
  );

  test(
    'should strip single quotes',
    processCSS("h1{background:url('cat.jpg')}", 'h1{background:url(cat.jpg)}')
  );

  test(
    'should pass through escaped whitespace and malformed URL tokens',
    passthroughCSS('h1{background:url(foo\\ bar.png);mask:url(foo(})}')
  );

  test(
    'should normalize empty and quoted URLs',
    processCSS(
      'h1{background:url(   ),url(" ./images/../cat.png ")}',
      'h1{background:url(),url(cat.png)}'
    )
  );

  test(
    'should strip double quotes uppercase URL',
    processCSS('h1{background:URL("cat.jpg")}', 'h1{background:URL(cat.jpg)}')
  );
});

describe('Escape', () => {
  test(
    'should pass through escaped whitespace in unquoted urls',
    passthroughCSS('h1{background:url(foo\\ bar.png)}')
  );

  test(
    'should pass through escaped parentheses in unquoted urls',
    passthroughCSS('h1{background:url(foo\\(bar.png)}')
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
});

describe('Normalize', () => {
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
});

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
  'should pass through trailing slashes',
  processCSS(
    'h1{background:url("https://localhost:4321/api/woff2/inter.woff2/")}',
    'h1{background:url(https://localhost:4321/api/woff2/inter.woff2/)}'
  )
);

describe('Normalize', () => {
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
});

describe('Minimise', () => {
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
});

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
