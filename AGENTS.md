# AGENTS.md

Guidance for coding agents working in this repository.

## Repository model

cssnano is a modular CSS minifier built on PostCSS and pnpm workspaces:

- `packages/cssnano` orchestrates presets.
- `packages/cssnano-preset-default` provides conservative semantic
  optimizations, `cssnano-preset-advanced` adds assumption-making transforms,
  and `cssnano-preset-lite` is limited to comments, whitespace, and empty-node
  cleanup.
- `packages/postcss-*` are independent optimization plugins.
- `packages/cssnano-utils` contains shared CSS parsing and manipulation utilities.
- `util` contains shared test, integration, fuzzing, build, and benchmark support;
  benchmarking utilities live under `util/benchmark/`.
- `site` contains the Astro documentation site.

Most package source is in `src`, generated declarations are in `types`, and tests are in `test`. Plugins compose through the PostCSS AST.

## Goals and evaluation

Every change should make the intended CSS transformation clearer while preserving CSS semantics and the repository’s supported compatibility behavior.

- Evaluate plugin changes at both the focused unit-test level and, when composition or output size can change, against preset integration coverage.
- Treat tests as executable contracts. Test names should identify the subject and the behavior being asserted, not merely the test framework.
- Follow a test-first workflow for behavior changes and bug fixes: add or update the focused test that expresses the intended contract before changing production code, run it to establish the expected failure when practical, then implement the change and rerun the test. If the behavior cannot be specified independently of the implementation, explain that exception and add the test as soon as the contract is clear.
- Keep independently meaningful contracts in separate tests, with one behavioral assertion per test where practical.
- Avoid echo tests (tautological verification): when testing data sets, tables, or constants, assert independent domain invariants (such as mathematical set equivalence against an authoritative specification oracle, structural syntax constraints, mutual exclusivity/disjointness, and immutability) or consumer transform behavior. Do not merely assert reference identity of internal exports or spot-check a selective subset of the implementation's hardcoded literals.
- Preserve existing coverage and investigate fixture changes rather than dismissing them as generated noise. Inputs may include invalid CSS, and their output can still be intentional.
- A transform must never turn an invalid declaration into a valid one, or drop a component it does not understand. Browsers ignore invalid declarations, so making one valid changes how the page renders. When unsure, leave the value byte-identical.
- Before collapsing a multi-value form to a shorter one, check what the grammar fills in for each omitted part (positions, margin/padding shorthands, `border-radius`, and so on). For example, a single `<position>` value implies `center` on the other axis, and a single number is always horizontal.
- A test that expects unchanged output must say in its name or a comment why the value cannot be shortened.
- Before handoff, validate the applicable repository contract: run the focused tests for changed packages, type checking (`./node_modules/.bin/tsc -b` or `pnpm run types`), and lint/format checks for every change. Add full tests or regenerated artifacts when the change affects them. For generated-data changes, regenerate first, then lint/format and test the consuming package; do not rely on inspection alone. Use the commands under Durable conventions and the current package scripts and runbooks. If a required check cannot be run, report that explicitly and do not claim full verification.
- A change should preserve or improve performance and asymptotic complexity. Avoid quadratic time in tests, scripts and algorithms; look for linear time. Performance refactors must preserve byte output unless an intentional output change is documented. Compare matched production benchmarks and measure independent hypotheses separately; use the performance runbook for commands and evidence requirements.

## Durable conventions

- Use Node’s built-in `test` module for repository package tests and the shared helpers. Plugin tests use `processCSSFactory()` from `util/testHelpers.js`; preset tests use `processCSSWithPresetFactory()` or `createCssnanoProcessor()` from `util/integrationTestHelpers.js`.
- Tests that assert wall-clock time or asymptotic scaling, and fuzz or exhaustive sweeps that take about a second or more, go in `packages/<pkg>/perf/` (plain `.js`, not `*.test.js`), so `node --test` and the coverage run skip them; run them with the `test:performance` script. Keep correctness assertions in `test/`.
- Keep package tests under `test/` and follow the existing filename convention for the package or subsystem (`*.js` and `*.test.js` are both present). Use `describe()` when it improves source readability without disturbing unrelated test order.
- Keep test-suite nesting shallow; avoid wrapping descriptive suites in redundant package- or preset-level suites.
- Apply the rule of three before extracting test helpers: tolerate small duplication until a third consumer needs the same setup or assertion contract.
- Keep generated declarations and generated integration fixtures synchronized with their sources. Do not hand-edit generated site data.
- Use pnpm for dependency and lockfile changes; never edit lockfiles by hand. If dependencies or workspace links are missing, use an approved `pnpm install` to repair them; never manually
  create, remove, move, or retarget files or symlinks under `node_modules`.
  To validate changes directly without requiring elevated permissions or invoking pnpm:
  - Focused package unit tests: `node --test packages/<pkg>/test/*.js`
  - Uncovered branches in a package: `node util/uncoveredBranches.js packages/<pkg>`
    (runs the package tests under coverage and prints the exact line numbers,
    block/branch indices, and source snippets of every 0-hit branch; arguments
    after the package path forward to `node --test`, and `--save-lcov=<path>`
    keeps the raw lcov report)
  - Preset integration tests: `node --test packages/cssnano-preset-*/test/integrations.test.js packages/cssnano-preset-default/test/pluginIdempotency.test.js`
  - Type checking: `./node_modules/.bin/tsc -b`
  - Linting: `./node_modules/.bin/oxlint packages/<pkg>` (or `.` for the entire workspace)
  - Formatting: `./node_modules/.bin/oxfmt packages/<pkg>` (verify with `--check`)
  - Integration framework fixtures: `node ./util/buildFrameworks.js`
    (preview with `--dry-run`). If production transform output changes intentionally, run
    `node ./util/buildFrameworks.js` to synchronize the framework integration
    fixtures, then verify the resulting git diff.
- When transforming CSS token microsyntaxes (such as `<an-plus-b>` formulas, attribute
  modifiers, and namespace qualifiers), never use regex or broad string replacements.
  Always respect token-boundary microsyntax specifications (CSS Syntax 3 and Selectors 4).
- Every dependency on an unpublished package that is present in this workspace
  must use the pnpm `workspace:^` protocol in package manifests. Search all
  package manifests when changing a workspace package dependency;
  a registry semver such as `^8.0.0` is invalid when only the local workspace
  version exists.
- Keep runtime behavior unchanged during types-only cleanup.
- Use modern JavaScript and Node built-ins.
- Write code comments so they state the goal or the leading idea; do not add lines of implementation details. Comments explain why, stay under 60 words when practical, and match the behavior. Use vocabulary that a CSS expert, designer or programmer would use; do not invent an idiosyncratic project-specific language.
- Documentation describes stable public contracts and security boundaries, not incidental implementation details.
- Keep runbook current-state claims aligned with the checked-out branch. Put
  unmerged or branch-specific architecture in an explicitly branch-scoped
  skill rather than describing it as repository-wide reality.
- Use precise W3C and MDN terminology and standard algorithm textbook terminology when naming functions and variables.
- Follow the repository’s lint rules, including the configured complexity and syntax restrictions, and use Conventional Commits.
- Distinguish integers from floating-point numbers in both JavaScript runtime arithmetic and CSS domain semantics:
  - In JavaScript, numbers are IEEE-754 double-precision floats. Keep integer math (such as hashes, indices, and offsets) strictly within `Number.MAX_SAFE_INTEGER` ($2^{53} - 1$), avoid accidental float division/modulo precision loss, and respect the repository's `no-bitwise` lint rule without producing fractional values.
  - In CSS transforms, never conflate CSS `<integer>` (e.g. `z-index`, `order`, grid tracks, `An+B` formulas) with CSS `<number>` (e.g. `opacity`, `flex-grow`, `line-height`). Transformations must preserve integer syntax where the specification requires it.
- Do not add changesets for internal refactors that do not change the public package behavior or API.

## Site boundary

Astro is the site’s generator and build path. Site changes must preserve base-aware routing, public assets, generated data, and sitemap behavior. Keep site-specific installation and validation details in `CONTRIBUTING.md` and the relevant site runbooks rather than duplicating them here.
