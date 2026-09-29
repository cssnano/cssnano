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
    name: 'let substituted values fill border cells without a barrier',
    find: '    hasSubstitution(d.value) ||',
    replace: '    false ||',
  },
  {
    name: 'reduce segments containing style hacks',
    find: '    if (stylehacks.detect(d) || !canExplode(d)) {',
    replace: '    if (!canExplode(d)) {',
  },
  {
    name: 'drop declarations a later one needs as a fallback',
    find: '        !strandsFallback(node, lastNode) &&',
    replace: '        true &&',
  },
];
