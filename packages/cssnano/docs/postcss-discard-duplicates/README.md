# [postcss][postcss]-discard-duplicates

> Discard duplicate rules in your CSS files with PostCSS.

## Install

With [npm](https://npmjs.org/package/postcss-discard-duplicates) do:

```
npm install postcss-discard-duplicates --save
```

## Example

This module will remove all duplicate rules from your stylesheets. It works on
at rules, normal rules and declarations. Note that this module does not have any
responsibility for normalising declarations, selectors or whitespace, so that it
considers these two rules to be different:

```css
h1, h2 {
    color: blue;
}

h2, h1 {
    color: blue;
}
```

It has to assume that your rules have already been transformed by another
processor, otherwise it would be responsible for too many things.

### Input

```css
h1 {
    margin: 0 auto;
    margin: 0 auto
}

h1 {
    margin: 0 auto
}
```

### Output

```css
h1 {
    margin: 0 auto
}
```

### Sibling conditional blocks

The module removes a declaration from an earlier `@media`, `@supports`,
`@container` or named `@layer` block when a later sibling block with
the same name and parameters repeats it.
The module keeps a `@layer` block, even if it is empty,
because the first appearance of a layer determines the layer order.
For the same reason it keeps every `@import`, since the imported style sheet
may declare layers.

```css
@media (min-width: 768px) {
    .a { top: 0 }
    .b { color: red }
}

@media (min-width: 768px) {
    .a { top: 0 }
}
```

becomes

```css
@media (min-width: 768px) {
    .b { color: red }
}

@media (min-width: 768px) {
    .a { top: 0 }
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
