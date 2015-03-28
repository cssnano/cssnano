# [postcss][postcss]-minify-selectors [![Build Status](https://travis-ci.org/ben-eb/postcss-minify-selectors.svg?branch=master)][ci] [![NPM version](https://badge.fury.io/js/postcss-minify-selectors.svg)][npm] [![Dependency Status](https://gemnasium.com/ben-eb/postcss-minify-selectors.svg)][deps]

> Minify selectors with PostCSS.

Install via [npm](https://npmjs.org/package/postcss-minify-selectors):

```
npm install postcss-minify-selectors --save
```

## Example

```js
var postcss = require('postcss')
var selectors = require('postcss-minify-selectors');

var css = 'h1 + p, h2, h3, h2{color:blue}';
console.log(postcss(selectors()).process(css).css);

// => 'h1+p,h2,h3{color:blue}'
```

For more examples see the [tests](test.js).

## Contributing

Pull requests are welcome. If you add functionality, then please add unit tests
to cover it.

## License

MIT © Ben Briggs

[ci]:      https://travis-ci.org/ben-eb/postcss-minify-selectors
[deps]:    https://gemnasium.com/ben-eb/postcss-minify-selectors
[npm]:     http://badge.fury.io/js/postcss-minify-selectors
[postcss]: https://github.com/postcss/postcss
