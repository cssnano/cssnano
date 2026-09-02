import {
  isTokenIdent,
  isTokenWhiteSpaceOrComment,
  tokenize,
  TokenType,
} from '@csstools/css-tokenizer';
import mappings from './lib/map.js';

const displayRegex = /^display$/i;
const displayOutside = new Set(['block', 'inline', 'run-in']);
const displayInside = new Set([
  'flow',
  'flow-root',
  'table',
  'flex',
  'grid',
  'ruby',
]);

/**
 * @param {string} value
 * @return {string}
 */
function toASCIILowerCase(value) {
  return value.replace(/[A-Z]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) + 0x20)
  );
}

/**
 * @param {string} identifier
 * @param {{ outer?: string, inner?: string, listItem?: string }} state
 * @return {boolean}
 */
function addIdentifier(identifier, state) {
  if (identifier === 'list-item') {
    if (state.listItem) {
      return false;
    }
    state.listItem = identifier;
  } else if (displayOutside.has(identifier)) {
    if (state.outer) {
      return false;
    }
    state.outer = identifier;
  } else if (displayInside.has(identifier)) {
    if (state.inner) {
      return false;
    }
    state.inner = identifier;
  } else {
    return false;
  }

  return true;
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  let count = 0;
  /** @type {{ outer?: string, inner?: string, listItem?: string }} */
  const state = {};

  for (const token of tokenize({ css: value })) {
    if (token[0] === TokenType.EOF) {
      break;
    }

    if (isTokenWhiteSpaceOrComment(token)) {
      continue;
    }

    if (!isTokenIdent(token)) {
      return value;
    }

    count++;
    if (count > 3) {
      return value;
    }

    const identifier = toASCIILowerCase(token[4].value);
    if (!addIdentifier(identifier, state)) {
      return value;
    }
  }

  if (count < 2) {
    return value;
  }

  if (
    state.listItem &&
    state.inner &&
    state.inner !== 'flow' &&
    state.inner !== 'flow-root'
  ) {
    return value;
  }

  const key = state.listItem
    ? `${state.outer ?? ''},${state.inner ?? ''},${state.listItem}`
    : `${state.outer ?? ''},${state.inner ?? ''}`;

  return mappings.get(key) ?? value;
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {string} value
 */
function assignValue(decl, value) {
  decl.value = value;
  if (decl.raws.value?.raw) {
    decl.raws.value = { raw: value, value };
  }
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-display-values',

    prepare() {
      const cache = new Map();
      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls(displayRegex, (decl) => {
            const value =
              decl.raws.value?.value === decl.value
                ? (decl.raws.value.raw ?? decl.value)
                : decl.value;

            if (!value) {
              return;
            }

            if (cache.has(value)) {
              assignValue(decl, cache.get(value));

              return;
            }

            const result = transform(value);

            assignValue(decl, result);
            cache.set(value, result);
          });
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
