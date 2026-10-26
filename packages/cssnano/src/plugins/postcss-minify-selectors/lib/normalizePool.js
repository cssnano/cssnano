import cssnanoUtils from '#utils';
import {
  dropHexEscapeTerminator,
  hexEscapeDigitCount,
  needsTerminatorAfterDigits,
} from './hexEscape.js';
import {
  classOrIdTokens,
  fixedTokens,
  nameToken,
  namespaceTokens,
} from './outputTokens.js';
import { serializeNormalized } from './serializeArena.js';
import { isImportantCommentToken } from './tokenUtils.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/** @typedef {import('./arena.js').Specificity} Specificity */
const { TokenType, tokenStart } = cssnanoUtils;
/** @typedef {import('./outputOverlay.js').Emit} Emit */
/** @typedef {{emit?:Emit,id:number,length:number,text?:string,sourceNode?:number,changed?:boolean,hexDigits?:number,head?:number}} Output */

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
    return this.texts.get(value) ?? this.intern(value, fixedTokens.get(value));
  }

  /**
   * A class or ID selector with the tokens that spell its text.
   * @param {SelectorArena} arena
   * @param {ArenaNode} node
   */
  classOrId(arena, node) {
    const text = classOrIdText(arena, node);
    return (
      this.texts.get(text) ?? this.intern(text, classOrIdTokens(arena, node))
    );
  }

  /**
   * A source comment with its token. Outputs are interned by text, so the
   * first token seen for a text is the one kept.
   * @param {CSSToken} token
   */
  comment(token) {
    return (
      this.texts.get(token[1]) ?? this.intern(token[1], Object.freeze([token]))
    );
  }

  /**
   * @param {string} value
   * @param {readonly CSSToken[] | undefined} tokens
   * @return {Output}
   */
  intern(value, tokens) {
    const emit = /** @type {Emit} */ (
      tokens ? { kind: 'text', value, tokens } : { kind: 'text', value }
    );
    const output = {
      emit,
      id: this.nextId++,
      length: value.length,
      text: value,
      hexDigits: hexEscapeDigitCount(value, value.length),
      head: value.charCodeAt(0),
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
    let digits = 0;
    for (const item of items) {
      id = this.pairId(id, item.id);
      length += item.length;
      // serializeNormalized inserts a terminator space between these pieces.
      if (needsTerminatorAfterDigits(digits, this.headCode(item))) length++;
      digits = this.trailingHexDigits(item);
    }
    const emit = {
      kind: /** @type {const} */ ('sequence'),
      items: items.map((item) => this.emit(item)),
    };
    return {
      emit,
      id,
      length,
      changed: true,
      hexDigits: digits,
      head: this.headCode(items[0]),
    };
  }

  /** @param {Output} output */
  headCode(output) {
    return output.sourceNode === undefined
      ? /** @type {number} */ (output.head)
      : this.arena.source.charCodeAt(
          offset(this.arena, this.arena.nodes[output.sourceNode].startToken)
        );
  }

  /** @param {Output} output */
  trailingHexDigits(output) {
    return output.sourceNode === undefined
      ? /** @type {number} */ (output.hexDigits)
      : hexEscapeDigitCount(
          this.arena.source,
          offset(this.arena, this.arena.nodes[output.sourceNode].endToken)
        );
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

/** @param {OutputPool} pool @param {Output} output */
export function outputText(pool, output) {
  if (output.text === undefined) {
    if (output.sourceNode !== undefined) {
      const node = pool.arena.nodes[output.sourceNode];
      output.text = sourceText(pool.arena, node.startToken, node.endToken);
    } else output.text = serializeNormalized(pool.arena, pool.emit(output));
  }
  return output.text;
}

/** @param {OutputPool} pool @param {Output} left @param {Output} right */
export function compareOutputs(pool, left, right) {
  const a = outputText(pool, left);
  const b = outputText(pool, right);
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Source spelling of a class (`.` and ident tokens) or ID (hash token).
 * @param {SelectorArena} arena @param {ArenaNode} node
 */
export function classOrIdSource(arena, node) {
  const { tokens } = arena;
  return node.kind === 'class'
    ? `${tokens[node.startToken][1]}${tokens[node.startToken + 1][1]}`
    : tokens[node.startToken][1];
}

/**
 * Serialized class or ID: an ident's hex escape terminator is restored by
 * the joiners, so it is dropped here.
 * @param {SelectorArena} arena @param {ArenaNode} node
 */
export function classOrIdText(arena, node) {
  const { tokens } = arena;
  return node.kind === 'class'
    ? `${tokens[node.startToken][1]}${dropHexEscapeTerminator(tokens[node.startToken + 1][1])}`
    : dropHexEscapeTerminator(tokens[node.startToken][1]);
}

/**
 * The output of a source token range, interned with the range's tokens. The
 * tokens are copied only for a text not yet interned.
 * @param {SelectorArena} arena @param {OutputPool} pool @param {number} start @param {number} end
 */
function sourceRangeOutput(arena, pool, start, end) {
  const text = sourceText(arena, start, end);
  return (
    pool.texts.get(text) ??
    pool.intern(text, Object.freeze(arena.tokens.slice(start, end)))
  );
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} start @param {number} end */
export function importantTrivia(arena, pool, start, end) {
  /** @type {Output[]} */ const output = [];
  for (let index = start; index < end; index++) {
    const token = arena.tokens[index];
    if (isImportantCommentToken(token)) output.push(pool.comment(token));
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
    } else if (isImportantCommentToken(token)) {
      output.push(pool.comment(token));
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
  return sourceRangeOutput(arena, pool, node.startToken, node.endToken);
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
    return sourceRangeOutput(arena, pool, node.startToken, node.endToken);
  let prefix = '';
  if (payload.namespace.kind === 'empty') prefix = '|';
  else if (payload.namespace.kind === 'wildcard') prefix = '*|';
  else if (payload.namespace.kind === 'named')
    prefix = `${dropHexEscapeTerminator(
      arena.tokens[payload.namespace.token][1]
    )}|`;
  const subject = arena.tokens[payload.subject.token];
  const subjectText = dropHexEscapeTerminator(subject[1]);
  const text = `${prefix}${subjectText}`;
  return (
    pool.texts.get(text) ??
    pool.intern(
      text,
      Object.freeze([
        ...namespaceTokens(arena, payload.namespace),
        nameToken(subject, subjectText),
      ])
    )
  );
}
