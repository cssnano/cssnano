export const name = 'merge-longhand: pair family rows';
export const target = new URL(
  '../../../../../src/passes/merge/lib/longhand/decl/pairForms.js',
  import.meta.url
).href;
export const test = new URL(
  '../../../../../test/passes/merge/lib/longhand/*.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'drop an outline color equal to currentcolor',
    find: '  components.push(color);',
    replace:
      "  if (asciiLowerCase(color) !== 'currentcolor') components.push(color);",
  },
  {
    name: 'accept hidden as an outline style',
    find: "(isBorderStyle(text) && asciiLowerCase(text) !== 'hidden') ||",
    replace: '(isBorderStyle(text) && true) ||',
  },
  {
    name: 'merge outline-style auto without checking the targets',
    find: "  return asciiLowerCase(style) === 'auto' ? ['keyword:outline-style-auto'] : [];",
    replace: '  return [];',
  },
  {
    name: 'leave the physical border properties out of the logical sides',
    find: '          ...allPhysicalBorderProperties,\n',
    replace: '',
  },
  {
    name: 'leave the axis shorthands out of the logical sides',
    find: '          axis,\n',
    replace: '',
  },
  {
    name: 'leave the legacy flow-relative names out of the logical sides',
    find: '          `border-$' + '{legacy}`,\n',
    replace: '',
  },
  {
    name: 'leave row-rule out of the pair families',
    find: "...['column-rule', 'row-rule'].map(ruleFamily)",
    replace: "...['column-rule'].map(ruleFamily)",
  },
  {
    name: 'give a property that several families share only its first family',
    find: '    if (families) families.push(pair);\n    else familiesOfName.set(name, [pair]);',
    replace: '    if (!families) familiesOfName.set(name, [pair]);',
  },
];
