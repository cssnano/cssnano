# [postcss][postcss]-discard-comments [![Build Status](https://travis-ci.org/ben-eb/postcss-discard-comments.svg?branch=master)][ci] [![NPM version](https://badge.fury.io/js/postcss-discard-comments.svg)][npm] [![Dependency Status](https://gemnasium.com/ben-eb/postcss-discard-comments.svg)][deps]

> Discard comments in your CSS files with PostCSS.


## Install

With [npm](https://npmjs.org/package/postcss-discard-comments) do:

```
npm install postcss-discard-comments --save
```


## Example

### Input

```css
h1/* heading */{
    margin: 0 auto
}
```

### Output

```css
h1 {
    margin: 0 auto
}
```

This module discards comments from your CSS files; by default, it will remove
all regular comments (`/* comment */`) and preserve comments marked as important
(`/*! important */`).

Note that this module does not handle source map comments because they are not
available to it; PostCSS handles this internally, so if they are removed then
you will have to [configure source maps in PostCSS][maps].

[maps]: https://github.com/postcss/postcss/blob/master/docs/source-maps.md


## API

### comments([options])

#### options

##### remove(function)

Type: `function`
Return: `boolean`
Variable: `comment` contains a comment without `/**/`

For each comment, return true to remove, or false to keep the comment.

```js
function(comment) {}
```

```js
var css = '/* headings *//*@ h1 */h1{margin:0 auto}/*@ h2 */h2{color:red}';
console.log(postcss(comments({
    remove: function(comment) { return comment[0] == "@"; }
})).process(css).css);
//=> /* headings */h1{margin:0 auto}h2{color:red}
```
**NOTE:** If you use the `remove` function other options will not be available.

##### removeAll

Type: `boolean`
Default: `false`

Remove all comments marked as important.

```js
var css = '/*! heading */h1{margin:0 auto}/*! heading 2 */h2{color:red}';
console.log(postcss(comments({removeAll: true})).process(css).css);
//=> h1{margin:0 auto}h2{color:red}
```

##### removeAllButFirst

Type: `boolean`
Default: `false`

Remove all comments marked as important, but the first one.

```js
var css = '/*! heading */h1{margin:0 auto}/*! heading 2 */h2{color:red}';
console.log(postcss(comments({removeAllButFirst: true})).process(css).css);
//=> /*! heading */h1{margin:0 auto}h2{color:red}
```


## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.


## Contributors

Thanks goes to these wonderful people ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
| [<img src="https://avatars.githubusercontent.com/u/1282980?v=3" width="100px;"/><br /><sub>Ben Briggs</sub>](http://beneb.info)<br />[💻](https://github.com/ben-eb/postcss-discard-comments/commits?author=ben-eb) [📖](https://github.com/ben-eb/postcss-discard-comments/commits?author=ben-eb) 👀 [⚠️](https://github.com/ben-eb/postcss-discard-comments/commits?author=ben-eb) | [<img src="https://avatars.githubusercontent.com/u/5103477?v=3" width="100px;"/><br /><sub>Dmitry Kiselyov</sub>](http://codepen.io/dmitrykiselyov)<br />[🐛](https://github.com/ben-eb/postcss-discard-comments/issues?q=author%3Admitrykiselyov) [💻](https://github.com/ben-eb/postcss-discard-comments/commits?author=dmitrykiselyov) [📖](https://github.com/ben-eb/postcss-discard-comments/commits?author=dmitrykiselyov) [⚠️](https://github.com/ben-eb/postcss-discard-comments/commits?author=dmitrykiselyov) | [<img src="https://avatars.githubusercontent.com/u/19105?v=3" width="100px;"/><br /><sub>Ivan Vlasenko</sub>](https://github.com/avanes)<br />[💻](https://github.com/ben-eb/postcss-discard-comments/commits?author=avanes) | [<img src="https://avatars.githubusercontent.com/u/231202?v=3" width="100px;"/><br /><sub>Joren Van Hee</sub>](http://joren.co)<br />[🐛](https://github.com/ben-eb/postcss-discard-comments/issues?q=author%3Ajorenvanhee) | [<img src="https://avatars.githubusercontent.com/u/224910?v=3" width="100px;"/><br /><sub>André König</sub>](http://andrekoenig.info/)<br />[🐛](https://github.com/ben-eb/postcss-discard-comments/issues?q=author%3Aakoenig) |
| :---: | :---: | :---: | :---: | :---: |
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors] specification. Contributions of
any kind welcome!

## License

MIT © [Ben Briggs](http://beneb.info)


[all-contributors]: https://github.com/kentcdodds/all-contributors
[ci]:      https://travis-ci.org/ben-eb/postcss-discard-comments
[deps]:    https://gemnasium.com/ben-eb/postcss-discard-comments
[npm]:     http://badge.fury.io/js/postcss-discard-comments
[postcss]: https://github.com/postcss/postcss
