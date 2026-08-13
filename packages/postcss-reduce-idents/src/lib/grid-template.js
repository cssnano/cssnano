'use strict';
const valueParser = require('postcss-value-parser');
const addToCache = require('./cache');
const isNum = require('./isNum');

const RESERVED_KEYWORDS = new Set([
  'auto',
  'span',
  'inherit',
  'initial',
  'unset',
]);

const gridTemplateProperties = new Set([
  'grid-template',
  'grid-template-areas',
  'grid-template-columns',
  'grid-template-rows',
]);

const gridChildProperties = new Set([
  'grid-area',
  'grid-column',
  'grid-row',
  'grid-column-start',
  'grid-column-end',
  'grid-row-start',
  'grid-row-end',
]);

const whitespaceRegex = /\s+/;
const multipleDotsRegex = /\.+/;

/**
 * Strips the brackets off a gridline name token, e.g. `[name]` -> `name`.
 * Area name tokens without brackets are returned unchanged.
 * @param {string} word
 * @return {string}
 */
function stripBrackets(word) {
  if (word.startsWith('[') && word.endsWith(']')) {
    return word.slice(1, -1);
  }
  if (word.startsWith('[')) {
    return word.slice(1);
  }
  if (word.endsWith(']')) {
    return word.slice(0, -1);
  }
  return word;
}

/**
 * @return {import('../index.js').Reducer}
 */
module.exports = function () {
  /** @type {Map<string, {ident: string, count: number}>} */
  const cache = new Map();
  /** @type {import('postcss').Declaration[]} */
  let declCache = [];

  return {
    collect(node, encoder) {
      if (node.type !== 'decl') {
        return;
      }

      if (gridTemplateProperties.has(node.prop.toLowerCase())) {
        valueParser(node.value).walk((child) => {
          if (child.type === 'string') {
            for (const word of child.value.split(whitespaceRegex)) {
              if (multipleDotsRegex.test(word)) {
                // reduce empty zones to a single `.`
                node.value = node.value.replace(word, '.');
              } else if (word && !RESERVED_KEYWORDS.has(word.toLowerCase())) {
                addToCache(word, encoder, cache);
              }
            }
          }
          /* handle gridline name lists like [name1 name2] */
          if (child.type === 'word') {
            const word = child.value;
            if (word.startsWith('[') && word.endsWith(']')) {
              const gridLine = word.slice(1, -1);
              addToCache(gridLine, encoder, cache);
            } else if (word.startsWith('[')) {
              const gridLine = word.slice(1);
              addToCache(gridLine, encoder, cache);
            } else if (word.endsWith(']')) {
              const gridLine = word.slice(0, -1);
              addToCache(gridLine, encoder, cache);
            }
          }
        });

        declCache.push(node);
      } else if (gridChildProperties.has(node.prop.toLowerCase())) {
        valueParser(node.value).walk((child) => {
          if (
            child.type === 'word' &&
            !RESERVED_KEYWORDS.has(child.value.toLowerCase())
          ) {
            addToCache(child.value, encoder, cache);
          }
        });

        declCache.push(node);
      }
    },

    transform() {
      // first pass: rename properties that reference an area/line name
      // (grid-area, grid-column, grid-row, ...), and count how many times
      // each name is referenced
      for (const declaration of declCache) {
        if (!gridChildProperties.has(declaration.prop.toLowerCase())) {
          continue;
        }

        declaration.value = valueParser(declaration.value)
          .walk((node) => {
            if (isNum(node)) {
              return false;
            }

            const cached = cache.get(node.value);
            if (cached) {
              cached.count++;
              node.value = cached.ident;
            }

            return false;
          })
          .toString();
      }

      // second pass: rename grid-template-* declarations, but only when at
      // least one of the names they define is referenced by a
      // grid-area/grid-column/grid-row elsewhere. Once a declaration is
      // known to be in use, every name it defines is renamed together so a
      // list like `[a b]` doesn't end up half-renamed.
      for (const declaration of declCache) {
        if (!gridTemplateProperties.has(declaration.prop.toLowerCase())) {
          continue;
        }

        let isUsed = false;
        valueParser(declaration.value).walk((node) => {
          for (const word of node.value.split(whitespaceRegex)) {
            const cached = cache.get(stripBrackets(word));
            if (cached && cached.count > 0) {
              isUsed = true;
            }
          }
          return false;
        });

        if (!isUsed) {
          continue;
        }

        declaration.value = valueParser(declaration.value)
          .walk((node) => {
            const words = node.value.split(whitespaceRegex);
            const newWords = [];
            for (const word of words) {
              const wordCached = cache.get(word);
              if (wordCached) {
                newWords.push(wordCached.ident);
                continue;
              }
              /* replace gridline names inside lists like [name] */
              if (word.startsWith('[') && word.endsWith(']')) {
                const gridLine = word.slice(1, -1);
                const cached = cache.get(gridLine);
                if (cached) {
                  newWords.push(`[${cached.ident}]`);
                } else {
                  newWords.push(word);
                }
              } else if (word.startsWith('[')) {
                const gridLine = word.slice(1);
                const cached = cache.get(gridLine);
                if (cached) {
                  newWords.push(`[${cached.ident}`);
                } else {
                  newWords.push(word);
                }
              } else if (word.endsWith(']')) {
                const gridLine = word.slice(0, -1);
                const cached = cache.get(gridLine);
                if (cached) {
                  newWords.push(`${cached.ident}]`);
                } else {
                  newWords.push(word);
                }
              } else {
                newWords.push(word);
              }
            }
            node.value = newWords.join(' '); // also merges white-spaces

            return false;
          })
          .toString();
      }

      // reset cache after transform
      declCache = [];
    },
  };
};
