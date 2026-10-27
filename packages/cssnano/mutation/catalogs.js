// Every mutation catalog, and the checks that judge it. `test: true` reruns
// the catalog's test file against each mutant; `suites` names the module of
// fuzz suites that judge it in the oracle check. Add a new catalog here only.
const mergeRulesSuites = new URL(
  '../script/passes/merge/rules/mutationSuites.js',
  import.meta.url
);

export const catalogs = [
  {
    url: new URL(
      './postcss-discard-empty/mutation-catalog.js',
      import.meta.url
    ),
    test: true,
  },
  {
    url: new URL(
      './postcss-discard-comments/mutation-catalog.js',
      import.meta.url
    ),
    test: true,
  },
  {
    url: new URL(
      './postcss-normalize-whitespace/mutation-catalog.js',
      import.meta.url
    ),
    test: true,
  },
  {
    url: new URL(
      './postcss-normalize-positions/mutation-catalog.js',
      import.meta.url
    ),
    test: true,
  },
  {
    url: new URL(
      './passes/merge/lib/longhand/mutation-catalog.js',
      import.meta.url
    ),
    test: true,
    suites: mergeRulesSuites,
  },
  {
    url: new URL('./pipeline/mutation-catalog-writers.js', import.meta.url),
    test: true,
  },
  {
    url: new URL('./pipeline/mutation-catalog-walk-values.js', import.meta.url),
    test: true,
  },
  {
    url: new URL(
      './postcss-unique-selectors/mutation-catalog-writers.js',
      import.meta.url
    ),
    test: true,
  },
  {
    url: new URL(
      './passes/merge/lib/longhand/mutation-catalog-validity.js',
      import.meta.url
    ),
    test: true,
    suites: mergeRulesSuites,
  },
  {
    url: new URL(
      './passes/merge/lib/longhand/mutation-catalog-candidates.js',
      import.meta.url
    ),
    test: true,
    suites: mergeRulesSuites,
  },
  {
    url: new URL(
      './passes/merge/lib/longhand/mutation-catalog-reset-gates.js',
      import.meta.url
    ),
    test: true,
    suites: mergeRulesSuites,
  },
  {
    url: new URL(
      './passes/merge/lib/rules/mutation-catalog.js',
      import.meta.url
    ),
    suites: mergeRulesSuites,
    test: true,
  },
  {
    url: new URL(
      './passes/merge/lib/rules/mutation-catalog-selector-writers.js',
      import.meta.url
    ),
    suites: mergeRulesSuites,
    test: true,
  },
  {
    url: new URL('./passes/merge/mutation-catalog.js', import.meta.url),
    suites: mergeRulesSuites,
    test: true,
  },
  {
    url: new URL(
      './passes/merge/lib/longhand/mutation-catalog-writers.js',
      import.meta.url
    ),
    test: true,
  },
  {
    url: new URL(
      './passes/merge/lib/longhand/decl/mutation-catalog-radius-writers.js',
      import.meta.url
    ),
    test: true,
  },
  {
    url: new URL('./values/mutation-catalog.js', import.meta.url),
    test: true,
  },
  {
    url: new URL('./values/mutation-catalog-buffer.js', import.meta.url),
    test: true,
  },
];
