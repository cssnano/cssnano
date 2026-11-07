# postcss-minify-params

> Minify at-rule params with PostCSS.

```css
@media only screen   and ( min-width: 400px, min-height: 500px ) {
    h2{
        color:blue
    }
}
```

```css
@media only screen and (min-width:400px,min-height:500px) {
    h2{
        color:blue
    }
}
```

## Usage

```js
import cssnano from 'cssnano';

postcss([cssnano({ preset: 'default' })]);
```

See [PostCSS] docs for examples for your environment.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).

## License

MIT © [Bogdan Chadkin](mailto:trysound@yandex.ru)

[PostCSS]: https://github.com/postcss/postcss
