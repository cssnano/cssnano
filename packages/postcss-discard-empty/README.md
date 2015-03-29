# [postcss][postcss]-discard-empty [![Build Status](https://travis-ci.org/ben-eb/postcss-discard-empty.svg?branch=master)][ci] [![NPM version](https://badge.fury.io/js/postcss-discard-empty.svg)][npm] [![Dependency Status](https://gemnasium.com/ben-eb/postcss-discard-empty.svg)][deps]

> Discard empty rules and values with PostCSS.

Install via [npm](https://npmjs.org/package/postcss-discard-empty):

```
npm install postcss-discard-empty --save
```

## Example

```js
var postcss = require('postcss')
var empty = require('postcss-discard-empty');

var css = '@font-face; h1 {} {color:blue} h2 {color:} h3 {color:red}';
console.log(postcss(empty()).process(css).css);

// => 'h3 {color:red}'
```

For more examples see the [tests](test.js).

## Contributing

Pull requests are welcome. If you add functionality, then please add unit tests
to cover it.

## License

MIT © Ben Briggs

[ci]:      https://travis-ci.org/ben-eb/postcss-discard-empty
[deps]:    https://gemnasium.com/ben-eb/postcss-discard-empty
[npm]:     http://badge.fury.io/js/postcss-discard-empty
[postcss]: https://github.com/postcss/postcss
