import {
  isTokenIdent,
  isTokenWhiteSpaceOrComment,
} from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import { ident } from '../../values/tokenConstructors.js';
import { whitespace } from '../../values/punctuationTokens.js';
import mappings from './lib/map.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

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
 * The mapped display of a value's tokens, or undefined to keep the value.
 *
 * @param {readonly CSSToken[]} input
 * @return {string | undefined}
 */
function transform(input) {
  let count = 0;
  /** @type {{ outer?: string, inner?: string, listItem?: string }} */
  const state = {};

  for (const token of input) {
    if (isTokenWhiteSpaceOrComment(token)) {
      continue;
    }

    if (!isTokenIdent(token)) {
      return undefined;
    }

    count++;
    if (count > 3) {
      return undefined;
    }

    const identifier = toASCIILowerCase(token[4].value);
    if (!addIdentifier(identifier, state)) {
      return undefined;
    }
  }

  if (count < 2) {
    return undefined;
  }

  if (
    state.listItem &&
    state.inner &&
    state.inner !== 'flow' &&
    state.inner !== 'flow-root'
  ) {
    return undefined;
  }

  const key = state.listItem
    ? `${state.outer ?? ''},${state.inner ?? ''},${state.listItem}`
    : `${state.outer ?? ''},${state.inner ?? ''}`;

  return mappings.get(key);
}

/**
 * The tokens of a mapped display: one identifier, or two separated by a space.
 * The mapped text is ours, so splitting it on the space is safe.
 *
 * @param {string} mapped
 * @return {CSSToken[]}
 */
function mappedTokens(mapped) {
  const [first, second] = mapped.split(' ');
  return second === undefined
    ? [ident(first)]
    : [ident(first), whitespace(), ident(second)];
}

/** @type {import('../../pipeline/host.js').Reducer} */
const reduce = (buffer) => {
  const input = buffer.tokens();
  const mapped = transform(input);
  if (mapped !== undefined) {
    buffer.replace(0, input.length, mappedTokens(mapped));
  }
};

/**
 * The stage for one run. It reads the `display` property.
 *
 * @return {import('../../pipeline/host.js').Stage}
 */
function displayStage() {
  return {
    forProperty: (property) =>
      displayPropertyRegex.test(property) ? reduce : null,
  };
}

/** @satisfies {import('../../pipeline/host.js').StageEntry} */
const normalizeDisplayValues = { create: () => displayStage() };

export { normalizeDisplayValues as default };
