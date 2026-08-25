import { isTokenNode } from '@csstools/css-parser-algorithms';
import { isTokenDelim } from '@csstools/css-tokenizer';
import { stringify } from '../lib/parse.js';
import joinGridValue from '../lib/joinGridValue.js';

const valuesOf = (nodes) => nodes.filter((node) => node.type !== 'whitespace').map((node) => node.toString());

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} gridAutoFlow */
const normalizeGridAutoFlow = (gridAutoFlow) => {
  const values = valuesOf(gridAutoFlow);
  if (!values.every((value) => ['dense', 'row', 'column'].includes(value.toLowerCase()))) return stringify(gridAutoFlow);
  return `${values.find((value) => ['row', 'column'].includes(value.toLowerCase())) || ''} ${values.find((value) => value.toLowerCase() === 'dense') || ''}`.trim();
};

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} gridGap */
const normalizeGridColumnRowGap = (gridGap) => {
  const values = valuesOf(gridGap);
  return values.includes('normal') ? `normal ${values.filter((value) => value !== 'normal').join(' ')}`.trim() : stringify(gridGap);
};

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} grid */
const normalizeGridColumnRow = (grid) => {
  const lines = [[]];
  for (const node of grid) {
    if (isTokenNode(node) && isTokenDelim(node.value) && node.value[1] === '/') lines.push([]);
    else lines.at(-1).push(node);
  }
  const normalizeLine = (line) => {
    const values = valuesOf(line);
    return `${values.filter((value) => value === 'span').join(' ')} ${values.filter((value) => value !== 'span').join(' ')}`.trim();
  };
  return lines.length > 1 ? joinGridValue(lines.map(normalizeLine)) : normalizeLine(lines[0]);
};

export { normalizeGridAutoFlow, normalizeGridColumnRowGap, normalizeGridColumnRow };
export default { normalizeGridAutoFlow, normalizeGridColumnRowGap, normalizeGridColumnRow };
