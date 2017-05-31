<h1 align="center">
    <br>
    <img width="360" src="https://rawgit.com/ben-eb/cssnano/master/media/logo.svg" alt="cssnano">
    <br>
    <br>
    <br>
</h1>

> A modular minifier, built on top of the [PostCSS] ecosystem.

[![Build Status](https://travis-ci.org/ben-eb/cssnano.svg?branch=master)][ci] [![Build status](https://ci.appveyor.com/api/projects/status/t1chyvhobtju7jy8/branch/master?svg=true)](https://ci.appveyor.com/project/ben-eb/cssnano/branch/master) [![Coverage Status](https://coveralls.io/repos/github/ben-eb/cssnano/badge.svg?branch=master)](https://coveralls.io/github/ben-eb/cssnano?branch=master) [![NPM version](https://badge.fury.io/js/cssnano.svg)][npm] [![Dependency Status](https://gemnasium.com/ben-eb/cssnano.svg)][deps] [![Gitter][chat-img]][chat]

[chat-img]:     https://img.shields.io/badge/Gitter-Join_the_PostCSS_chat-brightgreen.svg
[chat]:         https://gitter.im/postcss/postcss

cssnano is a modern, modular compression tool written on top of the PostCSS
ecosystem, which allows us to use a lot of powerful features in order to compact
CSS appropriately.

Our preset system allow you to load cssnano in a different configuration
depending on your needs; the default preset performs safe transforms, whereas
the advanced preset performs more aggressive transforms that are safe only when
your site meets the requirements; but regardless of the preset you choose, we
handle more than whitespace transforms!

Optimisations range from compressing colors & removing comments, to discarding
overridden at-rules, normalising `unicode-range` descriptors, even mangling
gradient parameters for a smaller output value! In addition, where it's made
sense for a transform, we've added [Browserslist](https://github.com/ai/browserslist)
to provide different output depending on the browsers that you support.

For further details check out the [website](http://cssnano.co/):

* [Installation guide for your build process](http://cssnano.co/guides/getting-started).
* [Full list of optimisations](http://cssnano.co/optimisations/).

You can now [try cssnano online](https://runkit.com/npm/cssnano) via Runkit!


## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).


## License

MIT © [Ben Briggs](http://beneb.info)


[PostCSS]: https://github.com/postcss/postcss

[ci]:      https://travis-ci.org/ben-eb/cssnano
[deps]:    https://gemnasium.com/ben-eb/cssnano
[npm]:     http://badge.fury.io/js/cssnano
