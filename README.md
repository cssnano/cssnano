<h1 align="center">
    <br>
    <img width="360" src="https://rawgit.com/cssnano/cssnano/master/media/logo.svg" alt="cssnano">
    <br>
    <br>
    <br>
</h1>

> A modular minifier, built on top of the [PostCSS](https://github.com/postcss/postcss) ecosystem.

[![Backers on Open Collective](https://opencollective.com/cssnano/backers/badge.svg)](#backers) [![Sponsors on Open Collective](https://opencollective.com/cssnano/sponsors/badge.svg)](#sponsors) [![NPM version](https://img.shields.io/npm/v/cssnano.svg)](https://www.npmjs.org/package/cssnano)
[![Build Status](https://github.com/cssnano/cssnano/actions/workflows/test.yml/badge.svg)](https://github.com/cssnano/cssnano/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/cssnano/cssnano/branch/master/graph/badge.svg)](https://codecov.io/gh/cssnano/cssnano)
[![Gitter](https://img.shields.io/badge/Gitter-Join_the_PostCSS_chat-brightgreen.svg)](https://gitter.im/postcss/postcss)

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

For further details check out the [website](https://cssnano.co/):

- [Installation guide for your build process](https://cssnano.co/docs/getting-started).
- [Full list of optimisations](https://cssnano.co/docs/what-are-optimisations/).

You can now [try cssnano online](https://cssnano.co/playground/)!

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].
<a href="https://github.com/cssnano/cssnano/graphs/contributors"><img src="https://opencollective.com/cssnano/contributors.svg?width=890&button=false" /></a>


## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/cssnano#backer)]

<a href="https://opencollective.com/cssnano#backers" target="_blank"><img src="https://opencollective.com/cssnano/backers.svg?width=890"></a>
## Sponsors
Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/cssnano#sponsor)]

<a href="https://opencollective.com/cssnano/sponsor/0/website" target="_blank"><img src="https://opencollective.com/cssnano/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/cssnano/sponsor/1/website" target="_blank"><img src="https://opencollective.com/cssnano/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/cssnano/sponsor/2/website" target="_blank"><img src="https://opencollective.com/cssnano/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/cssnano/sponsor/3/website" target="_blank"><img src="https://opencollective.com/cssnano/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/cssnano/sponsor/4/website" target="_blank"><img src="https://opencollective.com/cssnano/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/cssnano/sponsor/5/website" target="_blank"><img src="https://opencollective.com/cssnano/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/cssnano/sponsor/6/website" target="_blank"><img src="https://opencollective.com/cssnano/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/cssnano/sponsor/7/website" target="_blank"><img src="https://opencollective.com/cssnano/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/cssnano/sponsor/8/website" target="_blank"><img src="https://opencollective.com/cssnano/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/cssnano/sponsor/9/website" target="_blank"><img src="https://opencollective.com/cssnano/sponsor/9/avatar.svg"></a>



## License

MIT © [Ben Briggs](https://beneb.info)
