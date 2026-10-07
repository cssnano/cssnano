# [postcss][postcss]-merge-longhand

> Merge longhand properties into shorthand with PostCSS.

## Install

With [npm](https://npmjs.org/package/postcss-merge-longhand) do:

```
npm install postcss-merge-longhand --save
```

## Example

Merge longhand properties into shorthand; works with `margin`, `padding`,
`inset`, `scroll-margin`, `scroll-padding`, `border`, `columns` and the box
alignment `place-*` shorthands. For more examples see the [tests](test).

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

## Browser support

A browser that does not know `place-content`, `place-items` or `place-self`
ignores the whole declaration and loses both axes. The plugin therefore merges
alignment longhands into these shorthands only when every browser in your
[Browserslist](https://github.com/browserslist/browserslist) targets is known to
support all three. A target without compatibility data, such as Opera Mini,
counts as unsupported, so the Browserslist `defaults` query keeps the longhands.

The plugin accepts the Browserslist options `overrideBrowserslist`, `stats`,
`path` and `env`. The browser build for the web has no access to your targets
and assumes a fixed list that includes KaiOS, UC Browser and QQ Browser for
Android, so it keeps the longhands.

Values that a target may not parse, such as `safe`, `unsafe`, `last baseline`,
`left`, `right`, `legacy`, `anchor-center` and `safe normal`, merge only with a
value that depends on the same keywords. A browser that lacks one of them
drops the whole shorthand, where it would drop only one longhand.

The same holds for `inset`, the `-block` and `-inline` shorthands of `margin`,
`padding`, `inset`, `scroll-margin` and `scroll-padding`, and the `scroll-margin`
and `scroll-padding` shorthands, which arrived long after their longhands.
The plugin creates or grows one only when every target supports it, and
otherwise keeps the longhands. It still shortens a shorthand that is already
there.

## Writing modes

A flow-relative property such as `margin-block-start` sets a different physical
side depending on the `writing-mode` and `direction` of the element, which any
other rule may set. The plugin therefore never assumes either. It moves a
declaration, or drops one that a later declaration overrides, only when the
result is the same for every combination of the two. A physical declaration
(`margin-top`) between a flow-relative one and its shorthand stops the move,
and so does the legacy `scroll-snap-margin-*` spelling.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).

## License

MIT © [Ben Briggs](https://beneb.info)

[postcss]: https://github.com/postcss/postcss
