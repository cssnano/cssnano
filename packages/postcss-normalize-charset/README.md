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

## Usage

```js
postcss([ require('postcss-charset') ])
```

See [PostCSS] docs for examples for your environment.

MIT © [Bogdan Chadkin](mailto:trysound@yandex.ru)

[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/TrySound/postcss-charset.svg
[ci]:      https://travis-ci.org/TrySound/postcss-charset
