export const name = 'postcss-merge-longhand: candidates';
export const target = new URL(
  '../../src/plugins/postcss-merge-longhand/lib/decl/borderCandidates.js',
  import.meta.url
).href;
const builders = new URL(
  '../../src/plugins/postcss-merge-longhand/lib/decl/borderCandidateBuilders.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../test/postcss-merge-longhand/*.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'remove declarations preserved as fallbacks',
    find: '  for (const d of representedDecls) {\n    if (!fallbacks.has(d)) {',
    replace: '  for (const d of representedDecls) {\n    if (true) {',
  },
  {
    name: 'remove declarations that control cells outside a candidate footprint',
    find: '    if (removesOutsideFootprint) continue;',
    replace: '    if (false) continue;',
  },
  {
    name: 'ignore !important when comparing declaration byte cost',
    target: builders,
    find: '  for (const d of decls) sum += declCost(d.prop, d.value, important);',
    replace:
      '  for (const d of decls) sum += declCost(d.prop, d.value, false);',
  },
  {
    name: 'emit leaves for border cells the segment never set',
    target: builders,
    find: '    if (touched.has(i) && !blockedCells.has(i) && !coveredCells.has(i)) {',
    replace: '    if (!blockedCells.has(i) && !coveredCells.has(i)) {',
  },
  {
    name: 'offer a component shorthand over partly set border cells',
    target: builders,
    find: '      componentCells[c].every((i) => touched.has(i) && !barrierCells.has(i))',
    replace: '      componentCells[c].every((i) => !barrierCells.has(i))',
  },
  {
    name: 'insert the reduced shorthand before the declarations it represents',
    find: '  const anchor = repList.at(-1);',
    replace: '  const anchor = repList.at(0);',
  },
  {
    name: 'synthesize border resets from segments without a reset',
    target: builders,
    find: '  if (!hasReset || touched.size !== 12 || barrierCells.size !== 0) return [];',
    replace: '  if (touched.size !== 12 || barrierCells.size !== 0) return [];',
  },
  /* Not listed: reversing the equal-size mask tie-break in compareCandidates
   * has not changed the output of any rule found so far, so the mutant would
   * survive without proving a gap. The tie-break stays so the result does not
   * depend on candidate generation order. List the mutant once a rule whose
   * output it changes is found. */
];
