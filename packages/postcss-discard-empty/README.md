# [postcss][postcss]-discard-empty [![Build Status](https://travis-ci.org/ben-eb/postcss-discard-empty.svg?branch=master)][ci] [![NPM version](https://badge.fury.io/js/postcss-discard-empty.svg)][npm] [![Dependency Status](https://gemnasium.com/ben-eb/postcss-discard-empty.svg)][deps]

> Discard empty rules and values with PostCSS.

## Install

With [npm](https://npmjs.org/package/postcss-discard-empty) do:

```
npm install postcss-discard-empty --save
```

## Example

For more examples see the [tests](src/__tests__/index.js).

### Input

```css
@font-face;
h1 {}
{color:blue}
h2 {color:}
h3 {color:red}
```

### Output

```css
h3 {color:red}
```

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.


## Contributors

Thanks goes to these wonderful people ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
| [<img src="https://avatars.githubusercontent.com/u/1282980?v=3" width="100px;"/><br /><sub>Ben Briggs</sub>](http://beneb.info)<br />[💻](https://github.com/ben-eb/postcss-discard-empty/commits?author=ben-eb) [📖](https://github.com/ben-eb/postcss-discard-empty/commits?author=ben-eb) 👀 [⚠️](https://github.com/ben-eb/postcss-discard-empty/commits?author=ben-eb) | [<img src="https://avatars.githubusercontent.com/u/1737375?v=3" width="100px;"/><br /><sub></sub>](https://github.com/andyjansson)<br />[💻](https://github.com/ben-eb/postcss-discard-empty/commits?author=andyjansson) | [<img src="https://avatars.githubusercontent.com/u/7367?v=3" width="100px;"/><br /><sub>Duncan Beevers</sub>](http://www.duncanbeevers.com)<br />[💻](https://github.com/ben-eb/postcss-discard-empty/commits?author=duncanbeevers) [⚠️](https://github.com/ben-eb/postcss-discard-empty/commits?author=duncanbeevers) | [<img src="https://avatars.githubusercontent.com/u/38894?v=3" width="100px;"/><br /><sub>Stephen Way</sub>](http://stephenway.net)<br />[📖](https://github.com/ben-eb/postcss-discard-empty/commits?author=stephenway) |
| :---: | :---: | :---: | :---: |
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors] specification. Contributions of
any kind welcome!


## License

MIT © [Ben Briggs](http://beneb.info)


[all-contributors]: https://github.com/kentcdodds/all-contributors
[ci]:      https://travis-ci.org/ben-eb/postcss-discard-empty
[deps]:    https://gemnasium.com/ben-eb/postcss-discard-empty
[npm]:     http://badge.fury.io/js/postcss-discard-empty
[postcss]: https://github.com/postcss/postcss
