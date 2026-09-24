export const name = 'postcss-merge-longhand';
export const target = new URL(
  './src/lib/decl/borderReducer.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL('./test/*.js', import.meta.url).href;

export const mutations = [
  {
    name: 'mix !important declarations into the normal lane',
    find: `  const laneDecls = live.filter(
      (d) => Boolean(d.important) === lane && d.parent
    );`,
    replace: '  const laneDecls = live.filter((d) => d.parent);',
  },
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
    name: 'let a candidate shorthand touch untouched border cells',
    find: '  return candidates.filter((c) => footprintValid(c.decls, touched, hasReset));',
    replace: '  return candidates;',
  },
  {
    name: 'ignore !important when comparing declaration byte cost',
    find: '  for (const d of decls) sum += declCost(d.prop, d.value, important);',
    replace:
      '  for (const d of decls) sum += declCost(d.prop, d.value, false);',
  },
  {
    name: 'let substituted values fill border cells without a barrier',
    find: '    hasSubstitution(d.value) ||',
    replace: '    false ||',
  },
  {
    name: 'insert the reduced shorthand before the declarations it represents',
    find: '  const anchor = repList.at(-1);',
    replace: '  const anchor = repList.at(0);',
  },
  {
    name: 'reduce segments containing style hacks',
    find: '    if (stylehacks.detect(d) || !canExplode(d)) {',
    replace: '    if (!canExplode(d)) {',
  },
  {
    name: 'synthesize border resets from segments without a reset',
    find: '  if (!hasReset || touched.size !== 12 || barrierCells.size !== 0) return [];',
    replace: '  if (touched.size !== 12 || barrierCells.size !== 0) return [];',
  },
  {
    name: 'drop declarations a later one needs as a fallback',
    find: '        !strandsFallback(node, lastNode) &&',
    replace: '        true &&',
  },
  {
    name: 'prefer narrower shorthand coverage on equal-size tie-breaking',
    find: '    return b.mask - a.mask;',
    replace: '    return a.mask - b.mask;',
  },
];
