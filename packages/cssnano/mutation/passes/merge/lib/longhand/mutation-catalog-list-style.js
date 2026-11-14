export const name = 'merge-longhand: list-style family';
export const target = new URL(
  '../../../../../src/passes/merge/lib/longhand/decl/listStyleForms.js',
  import.meta.url
).href;
export const test = new URL(
  '../../../../../test/passes/merge/lib/longhand/*.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'write none for an all-initial value, which sets the type to none',
    find: "  return components.length ? components.join(' ') : 'disc';",
    replace: "  return components.length ? components.join(' ') : 'none';",
  },
  {
    name: 'write a none type beside an inside position',
    find: "    return asciiLowerCase(position) === 'outside' ? 'none' : null;",
    replace: "    return 'none';",
  },
  {
    name: 'accept inside as a counter-style name',
    find: "const reservedTypes = new Set(['inside', 'outside', 'auto', 'default']);",
    replace: "const reservedTypes = new Set(['outside', 'auto', 'default']);",
  },
  {
    name: 'accept an identifier image other than none',
    find: "  (text, tokens) => asciiLowerCase(text) === 'none' || startsWithUrl(tokens)",
    replace: '  () => true',
  },
];
