import { isFunctionNode, isTokenNode } from '@csstools/css-parser-algorithms';
import {
  isTokenDimension,
  isTokenIdent,
  isTokenPercentage,
} from '@csstools/css-tokenizer';
import keywords from './keywords.js';
import minifyFamily from './minify-family.js';
import minifyWeight from './minify-weight.js';
import { isSlash, parse, stringify } from './parse.js';

function isBoundary(value) {
  return (
    value === 'normal' ||
    value === 'inherit' ||
    value === 'initial' ||
    value === 'unset'
  );
}

const fontSizeUnits = new Set([
  'cap',
  'ch',
  'em',
  'ex',
  'ic',
  'lh',
  'rcap',
  'rch',
  'rem',
  'rex',
  'ric',
  'rlh',
  'vh',
  'vmax',
  'vmin',
  'vw',
  'vb',
  'vi',
  'px',
  'cm',
  'mm',
  'q',
  'in',
  'pc',
  'pt',
]);

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function isFontSize(node) {
  return (
    isTokenNode(node) &&
    (isTokenPercentage(node.value) ||
      (isTokenDimension(node.value) &&
        fontSizeUnits.has(node.value[4].unit.toLowerCase())))
  );
}

/** @param {string} value @param {Options} opts */
export default function minifyFont(value, opts) {
  const semicolon = value.endsWith(';') ? ';' : '';
  const nodes = parse(semicolon ? value.slice(0, -1) : value);
  let size = false;
  let boundary = Number.NaN;
  let familyStart = Number.NaN;
  let afterSlash = false;
  const replacements = new Map();
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (isTokenNode(node) && isTokenIdent(node.value) && !size) {
      const word = node.value[1].toLowerCase();
      if (
        isBoundary(word) ||
        keywords.style.has(word) ||
        keywords.variant.has(word) ||
        keywords.stretch.has(word)
      )
        boundary = index;
      else if (keywords.weight.has(word)) {
        boundary = index;
        replacements.set(index, minifyWeight(word));
      } else if (keywords.size.has(word)) {
        boundary = index;
        size = true;
      }
    } else if (isFontSize(node) && !size) {
      boundary = index;
      size = true;
    } else if (isFunctionNode(node) && nodes[index + 1]?.type === 'whitespace')
      boundary = index;
    if (isSlash(node)) {
      afterSlash = true;
      continue;
    }
    if (afterSlash && node.type === 'whitespace') {
      familyStart = index + 1;
      break;
    }
    if (size && Number.isNaN(familyStart)) {
      const next = nodes[index + 1];
      if (node.type === 'whitespace' || /^['"]/.test(next?.toString() || '')) {
        familyStart = index + 1;
      }
    }
  }
  if (Number.isNaN(familyStart)) familyStart = boundary + 2;
  const prefix = nodes
    .slice(0, familyStart)
    .map((node, index) => replacements.get(index) || stringify([node]))
    .join('');
  let family = stringify(nodes.slice(familyStart));
  const quotedFamily = /^['"]/.test(family);
  const separator =
    family &&
    !/\s$/.test(prefix) &&
    (quotedFamily || (/[a-z0-9%)]$/i.test(prefix) && /^[a-z]/i.test(family)))
      ? ' '
      : '';
  return `${prefix}${separator}${minifyFamily(family, opts)}${semicolon}`;
}

/** @typedef {{removeAfterKeyword?: boolean, removeDuplicates?: boolean, removeQuotes?: boolean}} Options */
