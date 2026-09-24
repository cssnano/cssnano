import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Remove', () => {
  test(
    'should remove the default port',
    processCSS(
      'h1{background:url(http://website.com:80/image.png)}',
      'h1{background:url(http://website.com/image.png)}'
    )
  );

  test(
    'should remove the HTTPS default port',
    processCSS(
      'h1{background:url(https://website.com:443/image.png)}',
      'h1{background:url(https://website.com/image.png)}'
    )
  );

  test(
    'should remove default port on IPv6 URLs and preserve non-default port',
    processCSS(
      'h1{background:url(http://[::1]:80/image.png)}h2{background:url(https://[::1]:443/image.png)}h3{background:url(http://[::1]:8080/image.png)}',
      'h1{background:url(http://[::1]/image.png)}h2{background:url(https://[::1]/image.png)}h3{background:url(http://[::1]:8080/image.png)}'
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
});

describe('Mangle', () => {
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
    'should not identify a Unicode lookalike data scheme',
    passthroughCSS('.has-svg:before{content:url(daťа:image/svg+xml,foo)}')
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
});

test(
  'should preserve explicit port 80 in protocol relative urls',
  processCSS(
    'h1{background:url(//website.com:80/image.png)}',
    'h1{background:url(//website.com:80/image.png)}'
  )
);

test(
  'should preserve explicit port 443 in protocol relative urls',
  processCSS(
    'h1{background:url(//website.com:443/image.png)}',
    'h1{background:url(//website.com:443/image.png)}'
  )
);

test(
  'should normalize file URLs without mangling root',
  processCSS('h1{background:url("file:///")}', 'h1{background:url(file:///)}')
);

test(
  'should normalize relative paths in file URLs',
  processCSS(
    'h1{background:url("file:///foo/../bar.png")}',
    'h1{background:url(file:///bar.png)}'
  )
);

test(
  'should strip trailing dot from hostname in absolute URLs',
  processCSS(
    'h1{background:url("http://example.com./foo.png")}',
    'h1{background:url(http://example.com/foo.png)}'
  )
);

test(
  'should preserve trailing slash in query string parameters in absolute URLs',
  processCSS(
    'h1{background:url("http://example.com/?dir=/")}',
    'h1{background:url(http://example.com/?dir=/)}'
  )
);

test(
  'should preserve percent-encoded control characters in absolute URLs',
  processCSS(
    'h1{background:url("https://example.com/foo%0Abar")}',
    'h1{background:url(https://example.com/foo%0Abar)}'
  )
);

test(
  'should preserve data URLs in CSS custom properties',
  passthroughCSS(
    ':root{--bg:url("data:image/png;base64,abc");--icon:url(data:image/svg+xml;utf8,<svg></svg>)}'
  )
);
