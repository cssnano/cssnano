# Contributing

Thanks for contributing to cssnano! We appreciate any contributions,
large or small. If you've contributed to cssnano we would recommend that
you add yourself to the list of contributors, found in [CONTRIBUTORS.md].

To do this, after you've set up the development environment, run:

```
yarn all-contributors
```

And follow the on-screen prompts.

[CONTRIBUTORS.md]: https://github.com/cssnano/cssnano/blob/master/CONTRIBUTORS.md

## How can I contribute to cssnano's code?

Since version 4, we now develop in a [Lerna](https://github.com/lerna/lerna)
monorepo. This is because a lot of transforms overlap with each other; it's
easier to test them together. Other than this, you'll need Node.js, yarn &
git installed. Then, you can run these commands to get the repository set up:

```
git clone git@github.com:cssnano/cssnano.git
cd cssnano
yarn install
```

You can run the tests with:

```
yarn test
```

We recommend that you look in the issue tracker to find anything tagged
[help wanted][help wanted]; that's the first port of call for getting stuck
in and writing code. If there's any other open issues that you think you can
tackle, please comment on the thread expressing your interest.

If you have an idea for some functionality which doesn't have an issue tracking
it, then please open an issue before writing a pull request. We find it more
helpful to discuss your requirements before writing any code.

To help us generate the changelog, follow the [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) format in your commit messages.

### Documentation

The documentation website is also included with the repository, under `/site`.
It runs [docusaurus](https://docusaurus.io) and requires a separate `yarn install`
to pull down the dependencies. You can then browse the documentation locally
by running `yarn start`.

Note that some of the documentation is automatically generated and should not
be edited by hand.

### Releasing

We use @changesets/cli to update the changelog and tag releases.
First make sure a changeset exists for every change you want to publish. A changeset is a text file
with the description of the change and the affected packages.
To create a changeset run

```
yarn changeset
```

It's best to select the affected packages by hand rather than rely on the tools automatically
discovering dependencies. For example, if a change affects a plugin `cssnano-preset-default`,
select the plugin and `cssnano-preset-default` by hand (as well as any other dependent presets).
To tag a release and generate the changelog, run:

```
yarn changeset version
```

To publish release to npm, run:

```
yarn all-publish
```

If you don't use the `package.json` script, do not forget to rebuild the packages first!

1. `yarn prepare`
2. `yarn changeset publish`

## Are there other ways of contributing?

Absolutely! Try any of the following areas:

### Improve our documentation

If there's something in our documentation that you think needs spell checking,
clearing up, additional code examples, or could be made better in some way,
help us by opening an issue detailing the problem.

Use the [documentation label][documentation] to find relevant issues.

### Improve our issues

Issues are like a secondary means of documenting the project, and in cases where
an issue is missing reproduction steps, please help us by co-ordinating with
the original author to find out more details about their problem.

Once the source of the error has been found, you can be of further help by
submitting a failing test case as a pull request. Many of our tests follow a
simple `fixture` & `expected` string comparison pattern.

### Send feedback on issues

Feedback on issues is very important and will shape the direction of cssnano.
Please help us by leaving constructive criticism on issues that matter to you,
and especially on issues labelled "[question][question]".

Note that we don't find "+1" comments to be very helpful; instead, use GitHub
reactions and subscribe to the thread to be notified of any progress. This helps
to keep our discourse focused on the topic at hand.

### Review pull requests

It's really important to get more eyes on upcoming features and fixes. Please
help by reviewing pull requests; even leaving a thumbs up reaction is better
than nothing at all. Helping us to review means less time is wasted by all of
us if a buggy release is cut.

### Talk with us!

We have an [online chat][chat] where you can ask questions or discuss features;
help us by joining the chat, and answer any questions that the community may
have. Feel free to ask any questions of your own!

## How you can support us

If you don't have time to contribute to the project directly, you can also
help us out by starring the repository, or [follow us on Twitter][twitter].
Word of mouth really does mean a lot to us!

You can also [help support us financially](/docs/support-us/).

[chat]: https://gitter.im/postcss/postcss
[documentation]: https://github.com/cssnano/cssnano/labels/documentation
[help wanted]: https://github.com/cssnano/cssnano/labels/help%20wanted
[question]: https://github.com/cssnano/cssnano/labels/question
[twitter]: https://twitter.com/cssnano_
