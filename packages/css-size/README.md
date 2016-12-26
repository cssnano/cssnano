# css-size [![Build Status](https://travis-ci.org/ben-eb/css-size.svg?branch=master)][ci] [![NPM version](https://badge.fury.io/js/css-size.svg)][npm] [![Dependency Status](https://gemnasium.com/ben-eb/css-size.svg)][deps]

> Display the size of a CSS file.

All results are shown using the [`gzip-size`] module, as this most accurately
represents what will be served to a client in production. It also provides a
better comparison between the minified and the original CSS.

CSS is minified with [`cssnano`].


## Install

With [npm](https://npmjs.org/package/css-size) do:

```
npm install css-size --save
```


## Example

```js
var css = 'h1 {\n  color: black;\n}\n';

cssSize(css).then(function (results) {
    console.log(results);

/*
    {
        original: '43 B',
        minified: '34 B',
        difference: '9 B',
        percent: '79.07%'
    }
*/

});

cssSize.table(css).then(function (table) {
    console.log(table);

/*
    ┌─────────────────┬────────┐
    │ Original (gzip) │ 43 B   │
    ├─────────────────┼────────┤
    │ Minified (gzip) │ 34 B   │
    ├─────────────────┼────────┤
    │ Difference      │ 9 B    │
    ├─────────────────┼────────┤
    │ Percent         │ 79.07% │
    └─────────────────┴────────┘
*/

});
```


## API

### `cssSize(input, options)`

Pass a string of CSS to receive an object with information about the original &
minified sizes (both are gzipped), plus difference and percentage results. The
options object is passed through to cssnano should you wish to compare sizes
using different options than the defaults.

### `cssSize.table(input, options)`

Use the table method instead to receive the results as a formatted table.

#### input

Type: `string`, `buffer`

### CLI

See the available options with:

```sh
$ css-size --help
```


## Related

* [`js-size`]: Display the size of a JS file.


## Contributing

Pull requests are welcome. If you add functionality, then please add unit tests
to cover it.


## License

MIT © [Ben Briggs](http://beneb.info)


[ci]:          https://travis-ci.org/ben-eb/css-size
[deps]:        https://gemnasium.com/ben-eb/css-size
[npm]:         http://badge.fury.io/js/css-size

[`cssnano`]:   https://github.com/ben-eb/cssnano
[`js-size`]:   https://github.com/lukekarrys/js-size
[`gzip-size`]: https://github.com/sindresorhus/gzip-size
