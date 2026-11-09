// Every mutation catalog, and the checks that judge it. `test: true` reruns
// the catalog's test file against each mutant; `suites` names the module of
// fuzz suites that judge it in the oracle check. Add a new catalog here only.
const mergeRulesSuites = new URL(
  '../script/passes/merge/rules/mutationSuites.js',
  import.meta.url
);
const duplicatesSuites = new URL(
  '../script/passes/merge/duplicates/mutationSuites.js',
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
    url: new URL('./pipeline/mutation-catalog-walk-values.js', import.meta.url),
    test: true,
  },
  {
    url: new URL('./pipeline/mutation-catalog-fold.js', import.meta.url),
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
      './postcss-reduce-idents/mutation-catalog-writers.js',
      import.meta.url
    ),
    test: true,
  },
  {
    url: new URL(
      './postcss-reduce-idents/mutation-catalog-counter-writers.js',
      import.meta.url
    ),
    test: true,
  },
  {
    url: new URL(
      './postcss-reduce-idents/mutation-catalog-grid-writers.js',
      import.meta.url
    ),
    test: true,
  },
  {
    url: new URL(
      './postcss-merge-idents/mutation-catalog-rewrite-writer.js',
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
      './passes/merge/lib/duplicates/mutation-catalog.js',
      import.meta.url
    ),
    suites: duplicatesSuites,
    test: true,
  },
  {
    url: new URL(
      './passes/merge/lib/duplicates/mutation-catalog-ids.js',
      import.meta.url
    ),
    suites: duplicatesSuites,
    test: true,
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
      './passes/merge/lib/rules/mutation-catalog-cache.js',
      import.meta.url
    ),
    test: true,
  },
  {
    url: new URL(
      './passes/merge/lib/rules/mutation-catalog-links.js',
      import.meta.url
    ),
    test: true,
  },
  {
    url: new URL(
      './passes/merge/lib/rules/mutation-catalog-moves.js',
      import.meta.url
    ),
    test: true,
  },
  {
    url: new URL(
      './passes/merge/lib/rules/mutation-catalog-selector-writers.js',
      import.meta.url
    ),
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
  {
    url: new URL(
      './postcss-minify-selectors/mutation-catalog-fixed-point.js',
      import.meta.url
    ),
    test: true,
  },
];

const catalogUrl = (path) => new URL(path, import.meta.url);

// `merge` is the merge gate: the rule merging, duplicate discarding and
// link catalogs, not every merge catalog; the longhand catalogs run with
// `--all`.
//
// A group is what one command judges: each run names its catalogs, the check
// that judges them and whether unkilled mutants fail it. The fuzz oracles
// leave some mutants unkilled by design; the selector writers must lose all.
const mergeRules = {
  check: 'oracle',
  allowUnkilled: true,
  catalogs: [catalogUrl('./passes/merge/lib/rules/mutation-catalog.js')],
};
const mergeDuplicates = {
  check: 'oracle',
  allowUnkilled: true,
  catalogs: [
    catalogUrl('./passes/merge/lib/duplicates/mutation-catalog.js'),
    catalogUrl('./passes/merge/lib/duplicates/mutation-catalog-ids.js'),
  ],
};
const mergeSelectorWriters = {
  check: 'test',
  allowUnkilled: false,
  catalogs: [
    catalogUrl('./passes/merge/lib/rules/mutation-catalog-selector-writers.js'),
  ],
};
// The cache mutants must all die under the rules' own tests: a survivor is a
// stale read the tests do not see.
const mergeCache = {
  check: 'test',
  allowUnkilled: false,
  catalogs: [catalogUrl('./passes/merge/lib/rules/mutation-catalog-cache.js')],
};

// The link checks' exceptions are judged by the rules' tests under checks,
// which the fuzz oracles never run.
const mergeLinks = {
  check: 'test',
  allowUnkilled: false,
  catalogs: [
    catalogUrl('./passes/merge/lib/rules/mutation-catalog-links.js'),
    catalogUrl('./passes/merge/lib/rules/mutation-catalog-moves.js'),
  ],
};

export const groups = {
  'merge-rules': [mergeRules],
  'merge-duplicates': [mergeDuplicates],
  'merge-selector-writers': [mergeSelectorWriters],
  'merge-cache': [mergeCache],
  'merge-links': [mergeLinks],
  merge: [
    mergeRules,
    mergeDuplicates,
    mergeSelectorWriters,
    mergeCache,
    mergeLinks,
  ],
};
