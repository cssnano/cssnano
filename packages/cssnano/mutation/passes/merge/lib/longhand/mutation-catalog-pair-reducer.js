export const name = 'merge-longhand: pair family reducer';
export const target = new URL(
  '../../../../../src/passes/merge/lib/longhand/decl/pairReducer.js',
  import.meta.url
).href;
export const test = new URL(
  '../../../../../test/passes/merge/lib/longhand/*.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'merge longhands beside a declaration that shares their cascade',
    find: '      (d) => !family.longhands.includes(asciiLowerCase(list.at(d).prop))',
    replace: '      () => false',
  },
  {
    name: 'merge a value that needs a feature the targets lack',
    find: '  if (family.requires?.(values).some((feature) => !features.has(feature))) {\n    return;\n  }\n',
    replace: '',
  },
  {
    name: 'merge longhands that carry different CSS-wide keywords',
    find: '  if (!sharesShorthandKeyword(values)) return;\n',
    replace: '',
  },
];
