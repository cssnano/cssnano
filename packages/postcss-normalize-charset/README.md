# postcss-normalize-charset [![Build Status][ci-img]][ci]

Add necessary or remove extra charset with PostCSS

```css
a{
  content: "©";
}
```

```css
@charset "utf-8";
a{
  content: "©";
}
```

## API

### normalizeCharset([options])

#### options

##### add

Type: `boolean`  
Default: `true`

Pass `false` to stop the module from adding a `@charset` declaration if it was
missing from the file (and the file contained non-ascii characters).

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributors

See [CONTRIBUTORS.md](https://github.com/ben-eb/cssnano/blob/master/CONTRIBUTORS.md).

## License

MIT © [Bogdan Chadkin](mailto:trysound@yandex.ru)

[ci-img]:  https://travis-ci.org/ben-eb/postcss-normalize-charset.svg
[ci]:      https://travis-ci.org/ben-eb/postcss-normalize-charset
