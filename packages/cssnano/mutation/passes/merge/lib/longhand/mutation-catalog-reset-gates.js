export const name = 'merge-longhand: reset candidate gates';
export const target = new URL(
  '../../../../../src/passes/merge/lib/longhand/decl/borderCandidateBuilders.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../../../../test/passes/merge/lib/longhand/*.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'synthesize a reset from cells whose support provenance differs',
    find: '  if (!hasConsistentSupport(allDecls, textTable)) return [];',
    replace: '  if (false) return [];',
  },
  {
    name: 'ignore a non-border fallback when admitting a reset candidate',
    find: "  for (const d of fallbacks) {\n    if (asciiLowerCase(d.prop) !== 'border') return [];\n  }",
    replace: '  void fallbacks;',
  },
  {
    name: 'ignore a declaration with its own support requirement',
    find: '      needsUnmetSupport(d, textTable)\n    ) {',
    replace: '      false\n    ) {',
  },
];
