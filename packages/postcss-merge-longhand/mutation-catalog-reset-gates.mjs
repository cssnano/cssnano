export const name = 'postcss-merge-longhand: reset candidate gates';
export const target = new URL(
  './src/lib/decl/borderReducer.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL('./test/*.js', import.meta.url).href;

export const mutations = [
  {
    name: 'synthesize a reset from cells with partial support or a fallback',
    find: '  if (hasPartialSupportOrFallback) return [];',
    replace: '  if (false) return [];',
  },
  {
    name: 'synthesize a reset from cells whose support provenance differs',
    find: '  if (!uniformSupport) return [];',
    replace: '  if (false) return [];',
  },
  {
    name: 'ignore a non-border fallback when admitting a reset candidate',
    find: "    ) || [...fallbacks].some((d) => d.prop.toLowerCase() !== 'border');",
    replace: '    );',
  },
  {
    name: 'ignore a declaration with its own support requirement',
    find: '        requiredSupport(d).size > 0',
    replace: '        false',
  },
];
