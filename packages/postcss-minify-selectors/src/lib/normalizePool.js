import cssnanoUtils from 'cssnano-utils';
import { parseAnPlusB } from './argumentParsers.js';
import { unquote } from './tokenUtils.js';

const { TokenType, tokenStart } = cssnanoUtils;
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {import('./outputOverlay.js').Emit} Emit */
/** @typedef {{emit?:Emit,id:number,length:number,text?:string,sourceNode?:number,changed?:boolean}} Output */

export class OutputPool {
  /** @param {SelectorArena} arena */
  constructor(arena) {
    this.arena = arena;
    /** @type {Map<string,Output>} */ this.texts = new Map();
    /** @type {Map<string,Map<number,Map<number,number>>>} */
    this.identities = new Map();
    /** @type {Map<string,number>} */ this.payloads = new Map();
    /** @type {Map<number,Map<number,number>>} */ this.pairs = new Map();
    this.nextId = 1;
    this.empty = this.text('');
  }

  /** @param {string} value @return {Output} */
  text(value) {
    const found = this.texts.get(value);
    if (found) return found;
    const output = {
      emit: /** @type {const} */ ({ kind: 'text', value }),
      id: this.nextId++,
      length: value.length,
      text: value,
      changed: true,
    };
    this.texts.set(value, output);
    return output;
  }

  /** @param {string} value */
  payload(value) {
    let id = this.payloads.get(value);
    if (id === undefined) {
      id = this.nextId++;
      this.payloads.set(value, id);
    }
    return id;
  }

  /**
   * The structural ID is interned from normalized local text and ordered child
   * IDs as each output sequence is assembled. It therefore carries significant
   * raw bytes without retaining arena positions.
   * @param {string} kind
   * @param {number} payload
   * @param {number} structure
   */
  identity(kind, payload, structure) {
    let byPayload = this.identities.get(kind);
    if (!byPayload) {
      byPayload = new Map();
      this.identities.set(kind, byPayload);
    }
    let structures = byPayload.get(payload);
    if (!structures) {
      structures = new Map();
      byPayload.set(payload, structures);
    }
    let id = structures.get(structure);
    if (id === undefined) {
      id = this.nextId++;
      structures.set(structure, id);
    }
    return id;
  }

  /** @param {number} left @param {number} right */
  pairId(left, right) {
    let rights = this.pairs.get(left);
    if (!rights) {
      rights = new Map();
      this.pairs.set(left, rights);
    }
    let id = rights.get(right);
    if (id === undefined) {
      id = this.nextId++;
      rights.set(right, id);
    }
    return id;
  }

  /** @param {readonly number[]} values */
  sequenceId(values) {
    if (values.length === 0) return this.empty.id;
    if (values.length === 1) return values[0];
    let id = 0;
    for (const value of values) id = this.pairId(id, value);
    return id;
  }

  /** @param {Output} output @return {Emit} */
  emit(output) {
    if (output.emit) return output.emit;
    if (output.sourceNode !== undefined)
      return { kind: 'node', node: output.sourceNode };
    throw new Error('normalized output has no emission');
  }

  /** @param {readonly Output[]} values @return {Output} */
  sequence(values) {
    const items = values.filter(({ length }) => length !== 0);
    if (items.length === 0) return this.empty;
    if (items.length === 1) return items[0];
    let id = 0;
    let length = 0;
    for (const item of items) {
      id = this.pairId(id, item.id);
      length += item.length;
    }
    const emit = {
      kind: /** @type {const} */ ('sequence'),
      items: items.map((item) => this.emit(item)),
    };
    return { emit, id, length, changed: true };
  }
}

/** @param {SelectorArena} arena @param {number} tokenIndex */
export function offset(arena, tokenIndex) {
  return tokenIndex === arena.tokens.length
    ? arena.source.length
    : tokenStart(arena.tokens[tokenIndex]);
}

/** @param {SelectorArena} arena @param {number} start @param {number} end */
export function sourceText(arena, start, end) {
  return arena.source.slice(offset(arena, start), offset(arena, end));
}

/** @param {import('./tokenUtils.js').CSSToken | undefined} token */
export function compactIdent(token) {
  if (!token) return '';
  return token[1];
}

/** @param {SelectorArena} arena @param {ArenaNode} node @param {number} tokenIndex */
export function compactTerminalIdent(arena, node, tokenIndex) {
  const value = compactIdent(arena.tokens[tokenIndex]);
  const next = arena.tokens[node.endToken];
  return !next ||
    next[0] === TokenType.Whitespace ||
    next[0] === TokenType.Comma ||
    next[0] === TokenType.CloseParen
    ? value.trimEnd()
    : value;
}

/** @param {import('./tokenUtils.js').CSSToken | undefined} token */
function decoded(token) {
  return (
    (/** @type {{value?:string}|undefined} */
    (token?.[4])?.value ?? token?.[1] ?? '').toLowerCase()
  );
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} start @param {number} end */
export function importantTrivia(arena, pool, start, end) {
  /** @type {Output[]} */ const output = [];
  for (let index = start; index < end; index++) {
    const token = arena.tokens[index];
    if (token[0] === TokenType.Comment && token[1].startsWith('/*!'))
      output.push(pool.text(token[1]));
  }
  return pool.sequence(output);
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} start @param {number} end */
export function trailingListTrivia(arena, pool, start, end) {
  /** @type {Output[]} */ const output = [];
  let pendingSpace = false;
  for (let index = start; index < end; index++) {
    const token = arena.tokens[index];
    if (token[0] === TokenType.Comma) break;
    if (token[0] === TokenType.Whitespace) pendingSpace = true;
    else if (token[0] === TokenType.Comment && token[1].startsWith('/*!')) {
      if (pendingSpace) output.push(pool.text(' '));
      output.push(pool.text(token[1]));
      pendingSpace = false;
    }
  }
  return pool.sequence(output);
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} start @param {number} end */
export function leadingListTrivia(arena, pool, start, end) {
  /** @type {Output[]} */ const output = [];
  let afterComma = false;
  for (let index = start; index < end; index++) {
    const token = arena.tokens[index];
    if (token[0] === TokenType.Comma) {
      output.length = 0;
      afterComma = true;
    } else if (
      afterComma &&
      token[0] === TokenType.Comment &&
      token[1].startsWith('/*!')
    )
      output.push(pool.text(token[1]));
  }
  return pool.sequence(output);
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node */
export function descendantCombinator(arena, pool, node) {
  /** @type {Output[]} */ const output = [];
  let lastWasSpace = false;
  for (let index = node.startToken; index < node.endToken; index++) {
    const token = arena.tokens[index];
    if (token[0] === TokenType.Whitespace) {
      if (!lastWasSpace) output.push(pool.text(' '));
      lastWasSpace = true;
    } else if (token[0] === TokenType.Comment && token[1].startsWith('/*!')) {
      output.push(pool.text(token[1]));
      lastWasSpace = false;
    }
  }
  if (!lastWasSpace) output.push(pool.text(' '));
  return pool.sequence(output);
}

/** @param {SelectorArena} arena @param {number} nodeIndex */
export function childrenOf(arena, nodeIndex) {
  /** @type {number[]} */ const children = [];
  arena.forEachChild(nodeIndex, (child) => children.push(child));
  return children;
}

/** @template {Output} T @param {(T | undefined)[]} normalized @param {number} nodeIndex @return {T} */
export function normalizedAt(normalized, nodeIndex) {
  const output = normalized[nodeIndex];
  if (!output) throw new Error('child node was released before its parent');
  return output;
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node */
export function rawOutput(arena, pool, node) {
  return pool.text(sourceText(arena, node.startToken, node.endToken));
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node @param {boolean} removable */
export function qualifiedNameOutput(arena, pool, node, removable) {
  const payload = arena.payloads.qualifiedNames[node.payload];
  if (
    removable &&
    payload.namespace.kind === 'absent' &&
    payload.subject.kind === 'universal'
  )
    return pool.empty;
  if (
    payload.namespace.kind === 'absent' &&
    node.endToken > payload.subject.token + 1
  )
    return pool.text(sourceText(arena, node.startToken, node.endToken));
  let prefix = '';
  if (payload.namespace.kind === 'empty') prefix = '|';
  else if (payload.namespace.kind === 'wildcard') prefix = '*|';
  else if (payload.namespace.kind === 'named')
    prefix = `${compactIdent(arena.tokens[payload.namespace.token])}|`;
  return pool.text(
    `${prefix}${compactTerminalIdent(arena, node, payload.subject.token)}`
  );
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node */
export function attributeOutput(arena, pool, node) {
  if (node.status !== 'valid') return rawOutput(arena, pool, node);
  const payload = arena.payloads.attributes[node.payload];
  const close = node.endToken - 1;
  let nameStart = payload.nameToken;
  let name = compactIdent(arena.tokens[payload.nameToken]);
  if (payload.namespace.kind === 'empty') {
    nameStart--;
    name = `|${name}`;
  } else if (payload.namespace.kind === 'wildcard') {
    nameStart -= 2;
    name = `*|${name}`;
  } else if (payload.namespace.kind === 'named') {
    nameStart = payload.namespace.token;
    name = `${compactIdent(arena.tokens[payload.namespace.token])}|${name}`;
  }
  /** @type {Output[]} */ const values = [pool.text('[')];
  values.push(importantTrivia(arena, pool, node.startToken + 1, nameStart));
  values.push(pool.text(name));
  let cursor = payload.nameToken + 1;
  if (!payload.matcher) {
    values.push(importantTrivia(arena, pool, cursor, close));
    values.push(pool.text(']'));
    return pool.sequence(values);
  }
  let matcherStart = cursor;
  while (
    matcherStart < close &&
    (arena.tokens[matcherStart][0] === TokenType.Whitespace ||
      arena.tokens[matcherStart][0] === TokenType.Comment)
  )
    matcherStart++;
  const matcherEnd = matcherStart + payload.matcher.length;
  values.push(importantTrivia(arena, pool, cursor, matcherStart));
  values.push(pool.text(payload.matcher));
  if (payload.valueToken === undefined) return rawOutput(arena, pool, node);
  values.push(
    importantTrivia(arena, pool, matcherEnd, payload.valueToken),
    pool.text(
      arena.tokens[payload.valueToken][0] === TokenType.String
        ? unquote(arena.tokens[payload.valueToken][1]).replace(/\\\n/gu, '')
        : compactIdent(arena.tokens[payload.valueToken])
    )
  );
  cursor = payload.valueToken + 1;
  if (payload.modifierToken !== undefined) {
    values.push(
      importantTrivia(arena, pool, cursor, payload.modifierToken),
      pool.text(` ${compactIdent(arena.tokens[payload.modifierToken])}`)
    );
    cursor = payload.modifierToken + 1;
  }
  values.push(importantTrivia(arena, pool, cursor, close), pool.text(']'));
  return pool.sequence(values);
}

/** @param {string | undefined} character */
function isHexDigit(character) {
  return character !== undefined && /^[\dA-F]$/iu.test(character);
}

/** @param {string} value */
function endsInShortHexEscape(value) {
  let index = value.length;
  while (index > 0 && value[index - 1] === ' ') index--;
  let digits = 0;
  while (index > 0 && digits < 6 && isHexDigit(value[index - 1])) {
    index--;
    digits++;
  }
  return digits > 0 && digits < 6 && value[index - 1] === '\\';
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} start @param {number} end */
function nextSerializedToken(input, start, end) {
  for (let index = start; index < end; index++) {
    const token = input[index];
    if (token[0] === TokenType.Whitespace) continue;
    if (token[0] !== TokenType.Comment || token[1].startsWith('/*!'))
      return token;
  }
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} start @param {number} end */
function hasImportantComment(input, start, end) {
  for (let index = start; index < end; index++)
    if (
      input[index][0] === TokenType.Comment &&
      input[index][1].startsWith('/*!')
    )
      return true;
  return false;
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index @param {number} end @param {boolean} important @param {boolean} foundSyntax */
function normalizedFormulaToken(input, index, end, important, foundSyntax) {
  const token = input[index];
  let value = token[1];
  if (value.endsWith(' ')) {
    const next = nextSerializedToken(input, index + 1, end);
    value =
      endsInShortHexEscape(value) && isHexDigit(next?.[1][0])
        ? `${value.trimEnd()} `
        : value.trimEnd();
  }
  if (important) return value;
  if (
    !foundSyntax &&
    ((token[0] === TokenType.Delim && value === '+') ||
      (token[0] === TokenType.Dimension && value.startsWith('+')) ||
      (token[0] === TokenType.Number && value.startsWith('+')))
  )
    value = value.slice(1);
  if (
    (token[0] === TokenType.Ident || token[0] === TokenType.Dimension) &&
    !value.includes('\\')
  )
    value = value.replaceAll('N', 'n');
  return value;
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} start @param {number} end */
export function normalizeAnPlusB(input, start, end) {
  const formula = parseAnPlusB(input, start, end);
  if (!formula) return;
  const important = hasImportantComment(input, start, end);
  /** @type {string[]} */ const pieces = [];
  let foundSyntax = false;
  let significantCount = 0;
  let singleIdent = '';
  for (let index = start; index < end; index++) {
    const token = input[index];
    if (token[0] === TokenType.Whitespace) continue;
    if (token[0] === TokenType.Comment) {
      if (token[1].startsWith('/*!')) pieces.push(token[1]);
      continue;
    }
    significantCount++;
    if (token[0] === TokenType.Ident) singleIdent = decoded(token);
    pieces.push(
      normalizedFormulaToken(input, index, end, important, foundSyntax)
    );
    foundSyntax = true;
  }
  let text = pieces.join('');
  if (!important && significantCount === 1) {
    if (singleIdent === 'even') text = '2n';
    else if (singleIdent === 'odd') text = 'odd';
  }
  return { formula, important, text };
}

/** @param {Emit} root @param {SelectorArena | undefined} arena */
