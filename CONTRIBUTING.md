# Contributing

Thanks for contributing to cssnano! We appreciate any contributions,
large or small. If you've contributed to cssnano we would recommend that
you add yourself to the list of contributors, found in [CONTRIBUTORS.md].

[CONTRIBUTORS.md]: https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md

## How can I contribute to cssnano's code?

We develop in a pnpm monorepo with two published packages: `cssnano`, which
contains the presets, the plugins and the shared utilities, and `postcss-svgo`.
You'll need Node.js, pnpm & git installed. Then, you can run these commands to get the repository set up:

```shell
git clone git@github.com:cssnano/cssnano.git
cd cssnano
pnpm install
```

Tests that assert running time or scaling, and slow fuzz sweeps, live in each package's `perf/`
directory, outside `test/`, so the OS and Node matrix and the coverage run skip
them. Run one with `node --test <file>`; CI runs them all once on Linux and the
result does not gate pull requests.

`pnpm test` is the one test command. With no arguments it runs every check a
pull request must pass: types, lint, format, every test, the framework
fixtures and the mutation baselines. It prints a line as each step starts and
ends, keeps each step's output in `test-results/`, and ends with
`test: done status=pass|fail`. With paths it runs only those tests:

```shell
pnpm test
pnpm test packages/cssnano/test/postcss-colormin/
```

When a change alters the output on purpose, `pnpm build:integration` updates
the framework fixtures; review the diff before committing.

Mutation testing is an opt-in test-quality check for realistic faults in a
plugin. It requires Node 24 or later and applies curated mutations in memory in an
isolated child process; source files are never changed. Run a named group of
catalogs with:

```shell
pnpm mutation --group merge
```

Groups are listed in `packages/cssnano/mutation/catalogs.js`, which is also
where to register a new catalog. `pnpm mutation --all` reruns every catalog
against its own test file, and `pnpm mutation --all --check oracle
--allow-unkilled` runs the catalogs that declare `suites` against the fuzz
suites. A mutant is only caught when the
run reports it as `killed`: `survived`, `unchanged` and `not reached` mean the
tests or oracles did not notice the fault, and `errored` and `timed out` mean
it was not judged.

Mutation testing is not part of the required test or CI path.

### Benchmarking

Benchmark comparisons are advisory, not regression gates. Each block runs a
fresh process per side in a balanced order and decides two endpoints, the
warm runtime and the cold start, against a 10% margin. A run stops as soon as
both endpoints have a verdict, or at its time budget. See
[the benchmark README](util/benchmark/README.md) for the verdict rule and its
limits.

```shell
pnpm bench:check -- --package=<plugin> --budget=90s
pnpm bench:check -- --corpus --budget=30m --base=<ref> --candidate=<ref>
pnpm bench:profile -- --case=selector-reduction
```

`bench:check` benchmarks the working tree against `HEAD` for a plugin's focused
cases and prints one line per case. `--corpus` runs the framework corpus, and
`bench:compare` is an alias for it. `bench:profile` writes a CPU profile of one
process. The benchmark README lists the other options.

The comparison CLI exits 0 for a generated report, including an inconclusive
report. Invalid artifacts, execution failures, and correctness mismatches exit
nonzero. Performance conclusions remain advisory and cannot fail the command
until an explicitly documented `--policy=gate` mode is introduced.

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
It runs [Astro](https://astro.build/) and requires a separate `pnpm install`
to pull down the dependencies. You can then browse the documentation locally
by running `pnpm start`.

Note that some of the documentation is automatically generated and should not
be edited by hand.

### Releasing

We use pnpm changesets to update the changelog.
First make sure a changeset exists for every change you want to publish. A changeset is a text file
with the description of the change and the affected packages.
To create a changeset run

```shell
pnpm change
```

Presets and plugins ship in the `cssnano` package, so a change to either selects `cssnano`.
Select `postcss-svgo` only for changes to that package.
To tag a release and generate the changelog, run:

```shell
pnpm version -r
```

To publish a release, run the publish workflow. It stages every workspace package with a
new version (`cssnano` and `postcss-svgo`) using `pnpm stage publish -r`; approve the
staged versions on npm.

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

## Support us

If you don't have time to contribute to the project directly, you can also
help us out by starring the repository.
Word of mouth really does mean a lot to us!

You can also [help support us financially](https://cssnano.github.io/cssnano/docs/support-us/).

[documentation]: https://github.com/cssnano/cssnano/labels/documentation
[help wanted]: https://github.com/cssnano/cssnano/labels/help%20wanted
[question]: https://github.com/cssnano/cssnano/labels/question
