import addToCache from './cache.js';
import {
  decoded,
  isIdentifier,
  isNumeric,
  isString,
  parse,
  serialize,
  walk,
} from './components.js';
import { cssWideKeywords, grid, resolveProperty } from './slots.js';

const reserved = new Set([...cssWideKeywords, ...grid.reservedKeywords]);
const whitespace = /\s+/;
const dots = /\.+/;
/** @param {string} word */
const usable = (word) => word && !reserved.has(word.toLowerCase());

export default function gridTemplateReducer() {
  /** @type {Map<string, {ident: string, count: number}>} */
  const cache = new Map();
  /** @type {import('postcss').Declaration[]} */
  let declarations = [];
  return {
    collect(node, encoder) {
      if (node.type !== 'decl') return;
      const property = resolveProperty(node.prop);
      if (grid.templateProperties.has(property)) {
        walk(parse(node.value), (child) => {
          if (isString(child))
            for (const word of decoded(child).split(whitespace))
              if (!dots.test(word) && usable(word))
                addToCache(word, encoder, cache);
          if (isIdentifier(child) && usable(child.value[1]))
            addToCache(child.value[1], encoder, cache);
        });
        declarations.push(node);
      } else if (grid.referenceProperties.has(property)) {
        walk(parse(node.value), (child) => {
          if (
            isIdentifier(child) &&
            !isNumeric(child) &&
            usable(child.value[1])
          )
            addToCache(child.value[1], encoder, cache);
        });
        declarations.push(node);
      }
    },
    transform() {
      for (const declaration of declarations) {
        if (!grid.referenceProperties.has(resolveProperty(declaration.prop)))
          continue;
        const values = parse(declaration.value);
        const replacements = new Map();
        walk(values, (node) => {
          if (!isIdentifier(node) || isNumeric(node)) return false;
          const cached = cache.get(node.value[1]);
          if (cached) {
            cached.count++;
            replacements.set(node, cached.ident);
          }
          return false;
        });
        declaration.value = serialize(values, replacements);
      }
      for (const declaration of declarations) {
        if (!grid.templateProperties.has(resolveProperty(declaration.prop)))
          continue;
        const values = parse(declaration.value);
        let used = false;
        walk(values, (node) => {
          if (isIdentifier(node) && cache.get(node.value[1])?.count)
            used = true;
          if (isString(node))
            for (const word of decoded(node).split(whitespace))
              if (cache.get(word)?.count) used = true;
        });
        if (!used) continue;
        const replacements = new Map();
        walk(values, (node) => {
          if (isIdentifier(node)) {
            const cached = cache.get(node.value[1]);
            if (cached) replacements.set(node, cached.ident);
          } else if (isString(node)) {
            const raw = node.toString();
            const value = decoded(node)
              .split(whitespace)
              .map((word) =>
                dots.test(word) ? '.' : (cache.get(word)?.ident ?? word)
              )
              .join(' ');
            replacements.set(node, `${raw[0]}${value}${raw.at(-1)}`);
          } else if (node.type === 'whitespace' || node.type === 'comment') {
            // Grid-template normalization has always collapsed separator
            // whitespace while rebuilding its named lines.
            replacements.set(node, ' ');
          }
        });
        declaration.value = serialize(values, replacements);
      }
      declarations = [];
    },
  };
}
