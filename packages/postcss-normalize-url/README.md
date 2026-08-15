# [postcss][postcss]-normalize-url

> [Normalize URLs](https://github.com/sindresorhus/normalize-url) with PostCSS.

## Install

With [npm](https://npmjs.org/package/postcss-normalize-url) do:

```
npm install postcss-normalize-url --save
```

## Example

### Input

```css
h1 {
    background: url("http://site.com:80/image.jpg")
}
```

### Output

```css
h1 {
    background: url(http://site.com/image.jpg)
}
```

Note that this module will also try to normalize relative URLs, and is capable
of stripping unnecessary quotes. For more examples, see the [tests](test/index.js).

## Security

This package optimizes `url()` values for output size. It does not provide URL
validation, sanitization, or security-policy enforcement.

If CSS may originate from untrusted users, apply your URL policy to the final
output before using it in a security-sensitive context.

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/master/CONTRIBUTORS.md).

## License

MIT © [Ben Briggs](https://beneb.info)

[docs]: https://github.com/sindresorhus/normalize-url#options
[postcss]: https://github.com/postcss/postcss
