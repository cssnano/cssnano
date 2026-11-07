# [postcss][postcss]-colormin

> Minify colors in your CSS files with PostCSS.

## Install

This plugin is part of `cssnano` and is no longer published as a separate package. It runs in the `cssnano` presets; see the [presets documentation](https://cssnano.github.io/cssnano/docs/presets/) to configure it.

## Example

```js
import postcss from 'postcss';
import cssnano from 'cssnano';

const css = 'h1 {color: rgba(255, 0, 0, 1)}';
const result = await postcss([cssnano()]).process(css, { from: undefined });
console.log(result.css);

// => 'h1{color:red}'
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
