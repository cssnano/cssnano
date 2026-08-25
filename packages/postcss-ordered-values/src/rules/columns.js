import { isTokenNode } from '@csstools/css-parser-algorithms';
import { unit } from '../lib/parse.js';

export default (columns) => {
  const widths = [], other = [];
  for (const node of columns) {
    if (!isTokenNode(node)) continue;
    if (unit(node)?.unit) widths.push(node.toString());
    else other.push(node.toString());
  }
  return other.length === 1 && widths.length === 1 ? `${widths[0].trimStart()} ${other[0].trimStart()}` : columns;
};
