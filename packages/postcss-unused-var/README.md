# postcss-unused-var

Postcss plugin to safely remove the unused CSS var from your styles

## Installation

```shell
npm install postcss-unused-var --save-dev
```

## Usage

Refer the [PostCSS Documentation](https://github.com/postcss/postcss#usage) for using this plugin.

## Example

### Input

```css
:root {
  --root-var-color: red;
}
#div1 {
  --main-txt-color: blue;
  --main-padding: 15px;
  --main-bg-color: coral;
  background-color: var(--main-bg-color);
}
```

### Output

```css
:root {
  --root-var-color: red;
}
#div1 {
  --main-bg-color: coral;
  background-color: var(--main-bg-color);
}
```

> Not removing the un-used variables from `:root` as they are available acroos the site and can be access in other stylesheet as well. So they might have used in other stylesheet so its not safe to remove them
