import {
  isTokenIdent,
  isTokenWhiteSpaceOrComment,
  tokenize,
  TokenType,
} from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import mappings from './lib/map.js';

const { asciiLowerCase } = cssnanoUtils;
const displayPropertyRegex = /^[dD][iI][sS][pP][lL][aA][yY]$/v;
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
  return asciiLowerCase(value);
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
/** @type {import('../../pipeline/host.js').Reducer} */
const reduce = (buffer) => {
  const text = buffer.text();
  const out = transform(text);
  if (out !== text) buffer.replaceText(out);
};

/**
 * The stage for one run. It reads the `display` property.
 *
 * @return {import('../../pipeline/host.js').ValueStage}
 */
function displayStage() {
  return {
    forProperty: (property) =>
      displayPropertyRegex.test(property) ? reduce : null,
  };
}

/** @type {import('../../pipeline/host.js').StageDescriptor} */
const normalizeDisplayValues = { compile: () => displayStage };

export { normalizeDisplayValues as default };
