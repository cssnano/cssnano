// Every mutation catalog, and the checks that judge it. `test: true` reruns
// the catalog's test file against each mutant; `suites` names the module of
// fuzz suites that judge it in the oracle check. Add a new catalog here only.
const mergeRulesSuites = new URL(
  '../script/postcss-merge-rules/mutationSuites.js',
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
      './postcss-merge-longhand/mutation-catalog.js',
      import.meta.url
    ),
    test: true,
    suites: mergeRulesSuites,
  },
  {
    url: new URL(
      './postcss-merge-longhand/mutation-catalog-validity.js',
      import.meta.url
    ),
    test: true,
    suites: mergeRulesSuites,
  },
  {
    url: new URL(
      './postcss-merge-longhand/mutation-catalog-candidates.js',
      import.meta.url
    ),
    test: true,
    suites: mergeRulesSuites,
  },
  {
    url: new URL(
      './postcss-merge-longhand/mutation-catalog-reset-gates.js',
      import.meta.url
    ),
    test: true,
    suites: mergeRulesSuites,
  },
  {
    url: new URL('./postcss-merge-rules/mutation-catalog.js', import.meta.url),
    suites: mergeRulesSuites,
    test: true,
  },
];
