# [postcss][postcss]-convert-values

> Convert values with PostCSS (e.g. ms -> s)

## Install

With [npm](https://npmjs.org/package/postcss-convert-values) do:

```
npm install postcss-convert-values --save
```

## Example

This plugin reduces CSS size by converting values to use different units
where possible; for example, `500ms` can be represented as `.5s`. You can
read more about these units in [this article][csstricks].

### Input

```css
h1 {
    font-size: 16px;
    width: 0em
}
```

### Output

```css
h1 {
    font-size: 1pc;
    width: 0
}
```

Note that this plugin only covers conversions for duration, frequency, angle
and absolute length values. For color conversions, use [postcss-colormin][colormin].

## API

### convertValues([options])

#### options

##### length

Type: `boolean`
Default: `true`

Pass `false` to disable conversion among `px`, `pt`, `pc` & `in`.
`cm` & `mm` always convert, and `q` is converted from but never to,
because it has lower browser support than `cm` and `mm`.

##### time

Type: `boolean`
Default: `true`

Pass `false` to disable conversion from `ms` to `s` & vice versa.

##### angle

Type: `boolean`
Default: `true`

Pass `false` to disable conversion from `deg` to `turn` & vice versa.

##### frequency

Type: `boolean`
Default: `true`

Pass `false` to disable conversion from `Hz` to `kHz` & vice versa.

##### precision

Type: `false|number`
Default: `false`

Specify any numeric value here to round dimensions (such as `px`, `em` or `s`
values) to that many decimal places;
for example, using `{precision: 2}` will round `6.66667px` to `6.67px`, and
`{precision: 0}` will round it to `7px`. Passing `false` (the default) will
leave these values as is.

It is recommended for most use cases to set this option to `2`.

##### transformCustomProperties

Type: `boolean`
Default: `false`

Pass `true` to also convert values in custom properties (`--*`). They are left
as written by default, because their value is only interpreted where it is
substituted.


## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.


## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).


## License

MIT © [Ben Briggs](https://beneb.info)


[postcss]: https://github.com/postcss/postcss
[csstricks]: https://css-tricks.com/the-lengths-of-css/
