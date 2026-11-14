export const name = 'merge-longhand: grid placement family';
export const target = new URL(
  '../../../../../src/passes/merge/lib/longhand/decl/gridPlacementForms.js',
  import.meta.url
).href;
export const test = new URL(
  '../../../../../test/passes/merge/lib/longhand/*.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'drop an end that repeats a custom identifier start',
    find:
      '  return end === implicitEnd(start) ? start : `$' +
      '{start} / $' +
      '{end}`;',
    replace: '  return end === "auto" ? start : `$' + '{start} / $' + '{end}`;',
  },
  {
    name: 'accept a zero line number',
    find: '  return span ? number > 0 : number !== 0;',
    replace: '  return span ? number > 0 : true;',
  },
  {
    name: 'accept a span with a zero count',
    find: '  return span ? number > 0 : number !== 0;',
    replace: '  return span ? true : number !== 0;',
  },
  {
    name: 'drop the row end that grid-area copies from the row start',
    find: '  if (count === 3 && rowEnd === rowImplicit) count = 2;',
    replace: "  if (count === 3 && rowEnd === 'auto') count = 2;",
  },
  {
    name: 'drop the column start that grid-area copies from the row start',
    find: '  if (count === 2 && columnStart === rowImplicit) count = 1;',
    replace: "  if (count === 2 && columnStart === 'auto') count = 1;",
  },
];
