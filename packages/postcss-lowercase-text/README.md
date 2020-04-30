# postcss-lowercase-text

Postcss plugin to safely lowercase your `CSS` selectors and properties in order to minimize your gzip size

## Installation

```shell
npm install postcss-lowercase-text --save
```

## Usage

Refer the [PostCSS Documentation](https://github.com/postcss/postcss#usage) for using this plugin.

## Example

### Selector

- Input

```css
a {
  color: red;
}

ul li {
  display: block;
}

h1#heading {
  color: red;
}

.outerClass.INNERCLASS {
  color: red;
}
```

- Output

```css
a {
  color: red;
}

ul li {
  display: block;
}

h1#heading {
  color: red;
}

.outerClass.INNERCLASS {
  color: red;
}
```

### Property

- Input

```css
.classname {
  color: red;
}

#someID {
  width: 100%;
}
```

- Output

```css
.classname {
  color: red;
}

#someID {
  width: 100%;
}
```

### Units

- Input

```css
#main {
  border: 1px solid black;
}

img {
  rotate: 10deg;
}
```

- Output

```css
#main {
  border: 1px solid black;
}

img {
  rotate: 10deg;
}
```

### AtRules

- Input

```css
@media screen and (min-width: 480px) {
  body {
    color: lightgreen;
  }
}
@charset "iso-8859-15";

@import url('fineprint.css') print;

@namespace prefix url(http://www.w3.org/1999/xhtml);

@supports (display: grid) {
  div {
    display: grid;
  }
}
```

- Output

```css
@media screen and (min-width: 480px) {
  body {
    color: lightgreen;
  }
}
@charset "iso-8859-15";

@import url('fineprint.css') print;

@namespace prefix url(http://www.w3.org/1999/xhtml);

@supports (display: grid) {
  div {
    display: grid;
  }
}
```

**Rules supported**

- [x] **@keyframes** Transform `name` , `params`, and `props` to lowercase
- [x] **@counter-style** Transform `name` , `params`, and `props` to lowercase
- [x] **@namespace** Transform `name` lowercase,
- [x] **@import** Transform `name`to lowercase,
- [x] **@font-face** Transform `name` and `props` to lowercase,
- [x] **@page** Transform `name` and `props` to lowercase
- [x] **@supports** Transform `name` and `props` to lowercase
- [x] **@media** Transform `name` and `props` to lowercase
- [x] **@charset** Transform `name` to lowercase,
- [x] **@document** Transform `name` to lowercase,
- [x] **@viewport** Transform `name` and `props` to lowercase,

## Explanation

All CSS style sheets are case-insensitive, except for parts that are not under the control of CSS. Like `id` and `class` are case sensitive so this plugin wont transform these things.

It will transform the selector where it is followed by `id(s)` or `class(s)`

_example_

```css
h1.HEADING {
  color: red;
}
```

here it will transform the `H1` to `h1` but not the class `.HEADING`

The values are parsed using `postcss-value-parser` and then their units are checked and converted to lowercase if required
