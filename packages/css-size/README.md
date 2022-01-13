# css-size

> Compare the size of a CSS file after processing it to the original.

Results are shown for uncompressed as well as when compressed using gzip
and brotli. For most users, one of the compressed sizes will best
represent what will be served to a client in production. It also
provides a better comparison between the minified and the original CSS.

CSS is expected to processed by [`postcss`] plugins but can be used with
any processing code that returns a promise that resolves to an object
with a `css` property.


## Install

With [npm](https://npmjs.org/package/css-size) do:

```
npm install css-size --save
```


## Example

```js
var postcss = require('postcss');
var autoprefixer = require('autoprefixer');
var nano = require('cssnano');
var css = 'h1 {\n  color: black;\n}\n';
var nanoOpts = {};
var cssSize = require("css-size");

function process(css, options) {
  return postcss([ autoprefixer, nano(options) ]).process(css);
}


cssSize(css, nanoOpts, process).then(function (results) {
    console.log(results);

/*
  { uncompressed:
     { original: '23 B',
       processed: '14 B',
       difference: '9 B',
       percent: '60.87%' },
    gzip:
     { original: '43 B',
       processed: '34 B',
       difference: '9 B',
       percent: '79.07%' },
    brotli:
     { original: '27 B',
       processed: '16 B',
       difference: '11 B',
       percent: '59.26%' } }
*/

});

cssSize.table(css, nanoOpts, process).then(function (table) {
    console.log(table);

/*
    ┌────────────┬──────────────┬────────┬────────┐
    │            │ Uncompressed │ Gzip   │ Brotli │
    ├────────────┼──────────────┼────────┼────────┤
    │ Original   │ 23 B         │ 43 B   │ 27 B   │
    ├────────────┼──────────────┼────────┼────────┤
    │ Processed  │ 14 B         │ 34 B   │ 16 B   │
    ├────────────┼──────────────┼────────┼────────┤
    │ Difference │ 9 B          │ 9 B    │ 11 B   │
    ├────────────┼──────────────┼────────┼────────┤
    │ Percent    │ 60.87%       │ 79.07% │ 59.26% │
    └────────────┴──────────────┴────────┴────────┘
*/

});

cssSize.numeric(css, nanoOpts, process).then(function (results) {
    console.log(results);
/*
{
  uncompressed: {
    original: 23,
    processed: 14,
    difference: 9,
    percent: 0.6087
  },
  gzip: {
    original: 43,
    processed: 34,
    difference: 9,
    percent: 0.7907
  },
  brotli: {
    original: 27,
    processed: 16,
    difference: 11,
    percent: 0.5926
  }
}
*/
});
```


## API

### `cssSize(input, options, processor)`

Pass `input` of CSS to receive an object with information about the
original & minified sizes (uncompressed, gzipped, and brotli'd), plus
difference and percentage results. The `options` object is passed
through to the `processor` should you wish to compare sizes using
different options than the defaults.

### `cssSize.numeric(input, options, processor)`

Exactly like `cssSize(...)` except the results are returned as numbers
instead of preformatted strings. In numeric mode, the `percentage` value is a
fraction (rounded to 4 significant digits), instead of being scaled to `100%`.

### `cssSize.table(input, options, processor)`

Use the table method instead to receive the results as a formatted table.

#### input

Type: `string`, `buffer`

#### options

Type: `object`

#### processor

Type: `function`

The processor accepts as arguments the input and options and returns a
Promise that resolves to an object with a `css` property containing the
processed css output.


### CLI

See the available options with:

```sh
$ css-size --help
```


## Related

* [`js-size`]: Display the size of a JS file.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/master/CONTRIBUTORS.md).


## License

MIT © [Ben Briggs](http://beneb.info)

[`postcss`]:   https://github.com/postcss/postcss
[`js-size`]:   https://github.com/lukekarrys/js-size
