# [postcss][postcss]-merge-rules [![Build Status](https://travis-ci.org/ben-eb/postcss-merge-rules.svg?branch=master)][ci] [![NPM version](https://badge.fury.io/js/postcss-merge-rules.svg)][npm] [![Dependency Status](https://gemnasium.com/ben-eb/postcss-merge-rules.svg)][deps]

> Merge CSS rules with PostCSS.

Install via [npm](https://npmjs.org/package/postcss-merge-rules):

```
npm install postcss-merge-rules --save
```

## Example

```js
var postcss = require('postcss');
var mergeRules = require('postcss-merge-rules');

var css = 'a{color:blue}a{font-weight:bold}';
console.log(postcss(mergeRules()).process(css).css);

// => 'a{color:blue;font-weight:bold}'
```

This module will attempt to merge *adjacent* CSS rules:

### By declarations

```css
a {
    color: blue;
    font-weight: bold
}

p {
    color: blue;
    font-weight: bold
}
```

Becomes:

```css
a,p {
    color: blue;
    font-weight: bold
}
```

### By selectors

```css
a {
    color: blue
}

a {
    font-weight: bold
}
```

Becomes:

```css
a {
    color: blue;
    font-weight: bold
}
```

### By partial declarations

```css
a {
    font-weight: bold
}

p {
    color: blue;
    font-weight: bold
}
```

Becomes:

```css
a,p {
    font-weight: bold
}

p {
    color: blue
}
```

## Contributing

Pull requests are welcome. If you add functionality, then please add unit tests
to cover it.

## License

MIT © Ben Briggs

[ci]:      https://travis-ci.org/ben-eb/postcss-merge-rules
[deps]:    https://gemnasium.com/ben-eb/postcss-merge-rules
[npm]:     http://badge.fury.io/js/postcss-merge-rules
[postcss]: https://github.com/postcss/postcss
