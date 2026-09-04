# [postcss][postcss]-merge-longhand

> Merge longhand properties into shorthand with PostCSS.

## Install

With [npm](https://npmjs.org/package/postcss-merge-longhand) do:

```
npm install postcss-merge-longhand --save
```

## Example

Merge longhand properties into shorthand; works with `margin`, `padding`,
`border` & `columns`. For more examples see the [tests](test).

### Input

```css
h1 {
  margin-top: 10px;
  margin-right: 20px;
  margin-bottom: 10px;
  margin-left: 20px;
}

h2 {
  column-width: 12em;
  column-count: 2;
}
```

### Output

```css
h1 {
  margin: 10px 20px;
}

h2 {
  columns: 12em 2;
}
```

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).

## License

MIT © [Ben Briggs](https://beneb.info)

[postcss]: https://github.com/postcss/postcss
