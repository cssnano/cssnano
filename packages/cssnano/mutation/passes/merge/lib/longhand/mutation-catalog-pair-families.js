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
    find: '        ...allPhysicalBorderProperties,\n      ],\n      parseValue: [\n        ruleComponent(isBorderWidth),',
    replace:
      '      ],\n      parseValue: [\n        ruleComponent(isBorderWidth),',
  },
  {
    name: 'leave the axis shorthands out of the logical sides',
    find: '        axis,\n',
    replace: '',
  },
  {
    name: 'leave the legacy flow-relative names out of the logical sides',
    find: '...legacySpellings([side]),',
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
  {
    name: 'merge border-block over sides that differ',
    find: '  return differs ? null : emitRule(start);',
    replace: '  return emitRule(start);',
  },
  {
    name: 'order the side families before the axis families, so the sides merge first',
    find: "  ...['block', 'inline'].map(axisFamily),\n  ...logicalBorderSides,",
    replace:
      "  ...logicalBorderSides,\n  ...['block', 'inline'].map(axisFamily),",
  },
  {
    name: 'leave the legacy side names out of the axis aliases',
    find: '...legacySpellings(sides),',
    replace: '',
  },
  {
    name: 'leave the physical border properties out of the axis aliases',
    find: '        ...allPhysicalBorderProperties,\n      ],\n      parseValue: [...sideParsers, ...sideParsers],',
    replace: '      ],\n      parseValue: [...sideParsers, ...sideParsers],',
  },
];
