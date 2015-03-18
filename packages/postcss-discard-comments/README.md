# [postcss][postcss]-discard-comments [![Build Status](https://travis-ci.org/ben-eb/postcss-discard-comments.svg?branch=master)][ci] [![NPM version](https://badge.fury.io/js/postcss-discard-comments.svg)][npm] [![Dependency Status](https://gemnasium.com/ben-eb/postcss-discard-comments.svg)][deps]

> Discard comments in your CSS files with PostCSS.

Install via [npm](https://npmjs.org/package/postcss-discard-comments):

```
npm install postcss-discard-comments --save
```

## Example

```js
var postcss = require('postcss')
var comments = require('postcss-discard-comments');

var css = 'h1/* heading */{margin:0 auto}';
console.log(postcss(comments()).process(css).css);

// => 'h1{margin:0 auto}'
```

This module discards comments from your CSS files; by default, it will remove
all regular comments (`/* comment */`) and preserve comments marked as important
(`/*! important */`) or that refer to a source mapping URL (`/*# sourcemap */`).

## API

### comments([options])

#### options

##### removeAll

Type: `boolean`
Default: `false`

Remove all comments marked as important.

```js
var css = '/*! heading */h1{margin:0 auto}/*! heading 2 */h2{color:red}';
console.log(postcss(comments({removeAll: true})).process(css).css);
//=> h1{margin:0 auto}h2{color:red}
```

##### removeAllButFirst

Type: `boolean`
Default: `false`

Remove all comments marked as important, but the first one.

```js
var css = '/*! heading */h1{margin:0 auto}/*! heading 2 */h2{color:red}';
console.log(postcss(comments({removeAllButFirst: true})).process(css).css);
//=> /*! heading */h1{margin:0 auto}h2{color:red}
```

## Contributing

Pull requests are welcome. If you add functionality, then please add unit tests
to cover it.

## License

MIT © Ben Briggs

[ci]:      https://travis-ci.org/ben-eb/postcss-discard-comments
[deps]:    https://gemnasium.com/ben-eb/postcss-discard-comments
[npm]:     http://badge.fury.io/js/postcss-discard-comments
[postcss]: https://github.com/postcss/postcss
