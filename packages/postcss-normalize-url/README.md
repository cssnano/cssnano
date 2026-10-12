# [postcss][postcss]-normalize-url

> Normalize URLs with PostCSS.

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
    background: url(http://site.com:80/image.jpg)
}
```

This module strips unnecessary quotes and whitespace from `url()` tokens. It
keeps the URL itself byte-identical: removing dot segments or duplicate slashes,
decoding percent-escapes or stripping a host's trailing dot are not equivalences
for every server. For more examples, see the [tests](test).

## Security

This package optimizes `url()` values for output size. It does not provide URL
validation, sanitization, or security-policy enforcement.

If CSS may originate from untrusted users, apply your URL policy to the final
output before using it in a security-sensitive context.

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).

## License

MIT © [Ben Briggs](https://beneb.info)

[postcss]: https://github.com/postcss/postcss
