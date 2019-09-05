# [postcss][postcss]-normalize-whitespace

> Normalize whitespace with PostCSS.

## Install

With [npm](https://npmjs.org/package/postcss-normalize-whitespace) do:

```
npm install postcss-normalize-whitespace --save
```

## Example

### Input

```css
h1 {
    width: calc(10px - ( 100px / var(--test) ));
    height: 20px;
}
```

### Output

```css
h1{width:calc(10px - 100px / var(--test));height:20px}
```

## API

### Options

#### removeLastSemicolon

type: `boolean`<br/>
default: `true`

Removes semicolon from the last declaration in the rule.

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/master/CONTRIBUTORS.md).

## License

MIT © [Ben Briggs](http://beneb.info)

[postcss]: https://github.com/postcss/postcss
