# [postcss][postcss]-colormin

> Minify colors in your CSS files with PostCSS.

## Install

With [npm](https://npmjs.org/package/postcss-colormin) do:

```
npm install postcss-colormin --save
```


## Example

```js
var postcss = require('postcss')
var colormin = require('postcss-colormin');

var css = 'h1 {color: rgba(255, 0, 0, 1)}';
console.log(postcss(colormin()).process(css).css);

// => 'h1 {color:red}'
```

For more examples see the [tests](test).


## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.


## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).


## License

MIT © [Ben Briggs](https://beneb.info)


[postcss]:  https://github.com/postcss/postcss
