# util

Support code for tests, checks and benchmarks. Most files here are libraries
that other code imports; only the scripts below are run by hand. Each script
starts with a header comment that gives its usage.

`pnpm test` is the gate and the only command a change needs to pass. It runs
`verify.js`, which runs `dataFreshness.js` and `buildFrameworks.js --dry-run`
itself. Use the scripts below to investigate, not to verify.

| Script | Use it to | In `pnpm test` |
| --- | --- | --- |
| `buildFrameworks.js` (`pnpm build:integration`) | regenerate the framework fixtures after an intended output change | dry run only |
| `presetSnapshot.js` | prove a refactor's output is byte-identical to a recorded baseline | no |
| `presetDifferential.js` | compare output with another revision over generated merge inputs | no |
| `corpusSize.js` | check no framework fixture grew against another revision | no |
| `fuzzAgainstRevision.js` | run a plugin's fuzzer against an older revision to show a fix matters | no |
| `valueValidity.js` | check with Chromium that no stage makes an ignored declaration valid | no |
| `pluginTiming.js` | show where time goes per preset entry | no |
| `tokenizerCalls.js` | count `tokenize` calls per preset entry | no |
| `uncoveredBranches.js` | list the 0-hit branches of a package or plugin under coverage | no |
| `packaging.e2e.js` | check the packed packages install and run | no |

Per-plugin fuzzers live in `packages/cssnano/script/<plugin>/fuzz.js`; run them
through `fuzzAgainstRevision.js` to test them against a revision.

Benchmarks and mutation testing have their own runners: see
`benchmark/README.md` and `pnpm mutation`.

Everything else (`fuzzCheck.js`, `fuzzRunner.js`, `fuzzRng.js`, `valueValidityCorpus.js`, `webref/`,
`countTokenize.js`, `selectorRanges.js`, `labelPlugins.js`, `chromium.js`,
`testHelpers.js`, `testArguments.js`, `integrationTestHelpers.js`) is imported
by tests or by the scripts above and is not run directly.
