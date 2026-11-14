export const name =
  'merge-longhand: text-emphasis and text-decoration families';
export const target = new URL(
  '../../../../../src/passes/merge/lib/longhand/decl/textForms.js',
  import.meta.url
).href;
export const test = new URL(
  '../../../../../test/passes/merge/lib/longhand/*.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'write a currentcolor text-emphasis color that is the initial value',
    find: "  if (asciiLowerCase(style) !== 'none') components.push(style);\n  if (asciiLowerCase(color) !== 'currentcolor') components.push(color);",
    replace:
      "  if (asciiLowerCase(style) !== 'none') components.push(style);\n  components.push(color);",
  },
  {
    name: 'accept two shapes in a text-emphasis style',
    find: '  return fills <= 1 && shapes <= 1 ? trimmed : null;',
    replace: '  return fills <= 1 ? trimmed : null;',
  },
  {
    name: 'drop the thickness feature a shorthand with a thickness needs',
    find: "    features.push('keyword:text-decoration-thickness');",
    replace: '    features.push();',
  },
  {
    name: 'drop the color-and-style feature a shorthand with a style or color needs',
    find: "    features.push('keyword:text-decoration-color-and-style');",
    replace: '    features.push();',
  },
  {
    name: 'accept a negative text-decoration thickness',
    find: '    isLengthValue(dimension.number, dimension.unit, true, true)',
    replace: '    isLengthValue(dimension.number, dimension.unit, true, false)',
  },
  {
    name: 'accept a repeated text-decoration line keyword',
    find: '  if (distinct.size !== words.length) return null;',
    replace: '',
  },
];
