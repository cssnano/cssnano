import cssnanoUtils from 'cssnano-utils';
import {
  firstPseudoReplacement,
  normalizeIdentArgument,
  normalizeIdentListArgument,
  normalizeIdentOrStringList,
  normalizePtNameArgument,
  parseAnPlusB,
} from './argumentParsers.js';
import { legacyPseudoElements } from './grammar.js';
import { hasSemanticFact, isFoldEligible, semanticFacts } from './arena.js';
import { unquote } from './tokenUtils.js';

const { TokenType, tokenStart } = cssnanoUtils;
/** @type {readonly number[]} */
const emptyChildren = Object.freeze([]);

/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./arena.js').ArenaNode} ArenaNode */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {import('./outputOverlay.js').Emit} Emit */
/** @typedef {{emit:Emit,id:number,length:number,text?:string,sourceNode?:number,sourceArena?:SelectorArena}} Output */
/** @typedef {Output & {node:number,parts?:Part[],foldEligible?:boolean,specificity?:Specificity,entries?:Normalized[],valid?:boolean,hasPseudoElement?:boolean,trailing?:Output}} Normalized */
/** @typedef {Normalized | {kind:'combinator',id:number,emit:Emit,text:string,length:number}} Part */

class OutputPool {
  /** @param {SelectorArena} arena */
  constructor(arena) {
    this.arena = arena;
    /** @type {Map<string,Output>} */ this.texts = new Map();
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
    };
    this.texts.set(value, output);
    return output;
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
      items: items.map(({ emit: item }) => item),
    };
    return { emit, id, length, sourceArena: this.arena };
  }
}

/** @param {SelectorArena} arena @param {number} tokenIndex */
function offset(arena, tokenIndex) {
  return tokenIndex === arena.tokens.length
    ? arena.source.length
    : tokenStart(arena.tokens[tokenIndex]);
}

/** @param {SelectorArena} arena @param {number} start @param {number} end */
function sourceText(arena, start, end) {
  return arena.source.slice(offset(arena, start), offset(arena, end));
}

/** @param {import('./tokenUtils.js').CSSToken | undefined} token */
function compactIdent(token) {
  if (!token) return '';
  return token[1];
}

/** @param {SelectorArena} arena @param {ArenaNode} node @param {number} tokenIndex */
function compactTerminalIdent(arena, node, tokenIndex) {
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
function importantTrivia(arena, pool, start, end) {
  /** @type {Output[]} */ const output = [];
  for (let index = start; index < end; index++) {
    const token = arena.tokens[index];
    if (token[0] === TokenType.Comment && token[1].startsWith('/*!'))
      output.push(pool.text(token[1]));
  }
  return pool.sequence(output);
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} start @param {number} end */
function trailingListTrivia(arena, pool, start, end) {
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

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node */
function descendantCombinator(arena, pool, node) {
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
function childrenOf(arena, nodeIndex) {
  /** @type {number[]} */ const children = [];
  arena.forEachChild(nodeIndex, (child) => children.push(child));
  return children;
}

/** @param {(Normalized | undefined)[]} normalized @param {number} nodeIndex */
function normalizedAt(normalized, nodeIndex) {
  const output = normalized[nodeIndex];
  if (!output) throw new Error('child node was released before its parent');
  return output;
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node */
function rawOutput(arena, pool, node) {
  return pool.text(sourceText(arena, node.startToken, node.endToken));
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node @param {boolean} removable */
function qualifiedNameOutput(arena, pool, node, removable) {
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
function attributeOutput(arena, pool, node) {
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
function normalizeAnPlusB(input, start, end) {
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
function flatten(root, arena) {
  /** @type {Emit[]} */ const work = [root];
  /** @type {string[]} */ const output = [];
  while (work.length > 0) {
    const item = work.pop();
    if (!item) break;
    if (item.kind === 'text') output.push(item.value);
    else if (item.kind === 'sequence')
      for (let index = item.items.length - 1; index >= 0; index--)
        work.push(item.items[index]);
    else if (item.kind === 'node' && arena) {
      const node = arena.nodes[item.node];
      output.push(sourceText(arena, node.startToken, node.endToken));
    } else if (item.kind === 'source' && arena)
      output.push(arena.source.slice(item.start, item.end));
    else
      throw new Error('arena normalization emitted an unresolved source node');
  }
  return output.join('');
}

/** @param {Output} output */
function outputText(output) {
  if (output.text === undefined) {
    if (output.sourceNode !== undefined && output.sourceArena) {
      const node = output.sourceArena.nodes[output.sourceNode];
      output.text = sourceText(
        output.sourceArena,
        node.startToken,
        node.endToken
      );
    } else output.text = flatten(output.emit, output.sourceArena);
  }
  return output.text;
}

/** @param {SelectorArena} arena @param {number} nodeIndex @param {Output} output */
function sourceNodeOutput(arena, nodeIndex, output) {
  return {
    ...output,
    emit: /** @type {const} */ ({ kind: 'node', node: nodeIndex }),
    sourceNode: nodeIndex,
    sourceArena: arena,
    text: undefined,
  };
}

/** @param {SelectorArena} arena @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children */
function canReuseContainer(arena, nodeIndex, normalized, children) {
  const node = arena.nodes[nodeIndex];
  if (node.kind === 'list' || node.kind === 'complex')
    return (
      children.length === 1 &&
      arena.nodes[children[0]].startToken === node.startToken &&
      arena.nodes[children[0]].endToken === node.endToken &&
      normalized[children[0]]?.sourceNode === children[0]
    );
  if (node.kind !== 'compound') return false;
  let cursor = node.startToken;
  for (const child of children) {
    const childNode = arena.nodes[child];
    if (
      childNode.startToken !== cursor ||
      normalized[child]?.sourceNode !== child
    )
      return false;
    cursor = childNode.endToken;
  }
  return cursor === node.endToken;
}

/** @param {SelectorArena} arena @param {ArenaNode} node @param {(Normalized | undefined)[]} normalized */
function canReusePseudo(arena, node, normalized) {
  const payload = arena.payloads.pseudos[node.payload];
  const argument = payload.argumentNode;
  return (
    argument !== undefined &&
    normalized[argument]?.sourceNode === argument &&
    arena.nodes[argument].startToken === payload.nameToken + 1 &&
    arena.nodes[argument].endToken === node.endToken - 1
  );
}

/** @param {SelectorArena} arena @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children @param {Output} output */
function canReuseSourceNode(arena, nodeIndex, normalized, children, output) {
  const node = arena.nodes[nodeIndex];
  if (
    output.length !==
    offset(arena, node.endToken) - offset(arena, node.startToken)
  )
    return false;
  if (node.kind === 'class')
    return (
      output.text ===
      `${arena.tokens[node.startToken][1]}${arena.tokens[node.startToken + 1][1]}`
    );
  if (node.kind === 'id')
    return output.text === arena.tokens[node.startToken][1];
  if (node.kind === 'raw') return true;
  if (node.kind === 'qualified-name')
    return output.text === sourceText(arena, node.startToken, node.endToken);
  if (node.kind === 'combinator')
    return output.text === sourceText(arena, node.startToken, node.endToken);
  if (
    node.kind === 'list' ||
    node.kind === 'complex' ||
    node.kind === 'compound'
  )
    return canReuseContainer(arena, nodeIndex, normalized, children);
  if (node.kind === 'pseudo') return canReusePseudo(arena, node, normalized);
  return false;
}

/** @param {Output} left @param {Output} right */
function compareOutputs(left, right) {
  const a = outputText(left);
  const b = outputText(right);
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** @param {SelectorArena} arena @param {number} start @param {number} end @param {string} grammar */
function microPseudoArgument(arena, start, end, grammar) {
  if (grammar === 'ident')
    return normalizeIdentArgument(arena.tokens, start, end);
  if (grammar === 'ident-list')
    return normalizeIdentListArgument(arena.tokens, start, end);
  if (grammar === 'ident-or-string-list')
    return normalizeIdentOrStringList(arena.tokens, start, end);
  if (grammar === 'pt-name-selector')
    return normalizePtNameArgument(arena.tokens, start, end);
}

/** @param {OutputPool} pool @param {string} prefix @param {string} name @param {Output} inner */
function wrapPseudo(pool, prefix, name, inner) {
  return pool.sequence([pool.text(`${prefix}${name}(`), inner, pool.text(')')]);
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node @param {string} prefix @param {string} name */
function nthPseudoOutput(arena, pool, node, prefix, name) {
  const payload = arena.payloads.pseudos[node.payload];
  const start = payload.nameToken + 1;
  const formula = normalizeAnPlusB(arena.tokens, start, node.endToken - 1);
  if (!formula) return;
  if (formula.text === '1') {
    const replacement = firstPseudoReplacement(payload.name.slice(4));
    if (replacement) return pool.text(replacement);
  }
  const useOdd =
    !formula.important &&
    formula.formula.isTwoNPlusOne &&
    (formula.text === '2n+1' || formula.text.includes('\\'));
  return wrapPseudo(
    pool,
    prefix,
    name,
    pool.text(useOdd ? 'odd' : formula.text)
  );
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node @param {(Normalized | undefined)[]} normalized @param {string} prefix @param {string} name */
function structuralPseudoOutput(arena, pool, node, normalized, prefix, name) {
  const payload = arena.payloads.pseudos[node.payload];
  if (payload.argumentNode === undefined) return;
  const argument = normalized[payload.argumentNode];
  if (!argument || argument.valid === false) return;
  if (payload.argumentGrammar !== 'an-plus-b-of')
    return wrapPseudo(pool, prefix, name, argument);
  const formula = normalizeAnPlusB(
    arena.tokens,
    payload.nameToken + 1,
    arena.nodes[payload.argumentNode].startToken - 1
  );
  if (!formula) return;
  return wrapPseudo(
    pool,
    prefix,
    name,
    pool.sequence([pool.text(formula.text), pool.text(' of '), argument])
  );
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {ArenaNode} node @param {(Normalized | undefined)[]} normalized */
function pseudoOutput(arena, pool, node, normalized) {
  if (node.status === 'invalid') return rawOutput(arena, pool, node);
  const payload = arena.payloads.pseudos[node.payload];
  const name = compactIdent(arena.tokens[payload.nameToken]).replace(
    /\($/u,
    ''
  );
  const prefix =
    payload.colonCount === 2 && legacyPseudoElements.has(payload.name)
      ? ':'
      : ':'.repeat(payload.colonCount);
  if (!payload.argumentGrammar) return pool.text(`${prefix}${name}`);
  let output;
  if (payload.argumentNode !== undefined)
    output = structuralPseudoOutput(
      arena,
      pool,
      node,
      normalized,
      prefix,
      name
    );
  else if (
    payload.argumentGrammar === 'an-plus-b' ||
    payload.argumentGrammar === 'an-plus-b-of'
  )
    output = nthPseudoOutput(arena, pool, node, prefix, name);
  else {
    const result = microPseudoArgument(
      arena,
      payload.nameToken + 1,
      node.endToken - 1,
      payload.argumentGrammar
    );
    if (result?.valid)
      output = wrapPseudo(
        pool,
        prefix,
        name,
        pool.text(result.pieces?.join('') ?? '')
      );
  }
  return output ?? rawOutput(arena, pool, node);
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children */
function compoundOutput(arena, pool, nodeIndex, normalized, children) {
  const node = arena.nodes[nodeIndex];
  if (
    node.status === 'invalid' &&
    children.some((child) => normalized[child]?.valid === false)
  )
    return rawOutput(arena, pool, node);
  const removableUniversal =
    children.length > 1 && !arena.payloads.lists[0]?.hasDefaultNamespace;
  /** @type {Output[]} */ const output = [];
  let cursor = node.startToken;
  for (const childIndex of children) {
    const child = arena.nodes[childIndex];
    output.push(importantTrivia(arena, pool, cursor, child.startToken));
    output.push(
      child.kind === 'qualified-name'
        ? qualifiedNameOutput(arena, pool, child, removableUniversal)
        : normalizedAt(normalized, childIndex)
    );
    cursor = child.endToken;
  }
  output.push(importantTrivia(arena, pool, cursor, node.endToken));
  return pool.sequence(output);
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children */
function complexOutput(arena, pool, nodeIndex, normalized, children) {
  const node = arena.nodes[nodeIndex];
  const recoversPseudoElement =
    node.status === 'invalid' &&
    hasSemanticFact(node.facts ?? 0, semanticFacts.pseudoElement) &&
    children.every((child) => !normalized[child]?.hasPseudoElement);
  if (node.status === 'invalid' && !recoversPseudoElement)
    return rawOutput(arena, pool, node);
  /** @type {Output[]} */ const output = [];
  /** @type {Part[]} */ const parts = [];
  let cursor = node.startToken;
  for (const childIndex of children) {
    const child = arena.nodes[childIndex];
    output.push(importantTrivia(arena, pool, cursor, child.startToken));
    if (child.kind === 'combinator') {
      const value = arena.payloads.combinators[child.payload].value;
      const item =
        value === ' '
          ? descendantCombinator(arena, pool, child)
          : pool.text(value);
      output.push(item);
      parts.push({ kind: 'combinator', ...item, text: outputText(item) });
    } else {
      const item = normalizedAt(normalized, childIndex);
      output.push(item);
      parts.push(item);
    }
    cursor = child.endToken;
  }
  const trailing = trailingListTrivia(arena, pool, cursor, node.endToken);
  output.push(trailing);
  return {
    ...pool.sequence(output),
    node: nodeIndex,
    parts,
    trailing: trailing.length !== 0 ? trailing : undefined,
  };
}

/** @param {OutputPool} pool @param {readonly Normalized[]} entries */
function joinEntries(pool, entries) {
  /** @type {Output[]} */ const output = [];
  for (let index = 0; index < entries.length; index++) {
    if (index > 0) output.push(pool.text(','));
    output.push(entries[index]);
  }
  return pool.sequence(output);
}

/** @param {Normalized[]} entries @param {Set<string>} seenText @param {Normalized} entry @param {boolean} isOuter @param {boolean} vendor */
function addListEntry(entries, seenText, entry, isOuter, vendor) {
  if (vendor) {
    entries.push(entry);
    return;
  }
  if (isOuter) {
    const text = outputText(entry);
    if (!text || seenText.has(text)) return;
    seenText.add(text);
    entries.push(entry);
    return;
  }
  if (entries.length < 16) {
    if (!entries.some(({ id }) => id === entry.id)) entries.push(entry);
    return;
  }
  if (seenText.size === 0)
    for (const item of entries) seenText.add(outputText(item));
  const text = outputText(entry);
  if (!text || seenText.has(text)) return;
  seenText.add(text);
  entries.push(entry);
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {boolean} sort @param {readonly number[]} children */
function listOutput(arena, pool, nodeIndex, normalized, sort, children) {
  const node = arena.nodes[nodeIndex];
  const payload = arena.payloads.lists[node.payload];
  if (node.status === 'invalid' && payload.mode !== 'forgiving')
    return rawOutput(arena, pool, node);
  /** @type {Normalized[]} */ const entries = [];
  const seenText = new Set();
  const isOuter = nodeIndex === 0;
  for (let position = 0; position < children.length; position++) {
    const childIndex = children[position];
    const child = arena.nodes[childIndex];
    if (payload.mode === 'forgiving' && normalized[childIndex]?.valid === false)
      continue;
    let entry = normalized[childIndex];
    if (!entry) continue;
    const nextStart =
      position + 1 < children.length
        ? arena.nodes[children[position + 1]].startToken
        : node.endToken;
    const trailing = trailingListTrivia(arena, pool, child.endToken, nextStart);
    if (trailing.length > 0)
      entry = {
        ...entry,
        node: entry.node,
        ...pool.sequence([entry, trailing]),
        trailing: entry.trailing
          ? pool.sequence([entry.trailing, trailing])
          : trailing,
      };
    addListEntry(
      entries,
      seenText,
      entry,
      isOuter,
      hasSemanticFact(child.facts ?? 0, semanticFacts.vendorPseudo)
    );
  }
  if (sort && entries.length > 1) entries.sort(compareOutputs);
  return { ...joinEntries(pool, entries), entries };
}

/** @param {{pairs:Map<number,Map<number,number>>,next:number}} state @param {number} left @param {number} right */
function consId(state, left, right) {
  let rights = state.pairs.get(left);
  if (!rights) {
    rights = new Map();
    state.pairs.set(left, rights);
  }
  let id = rights.get(right);
  if (id === undefined) {
    id = state.next++;
    rights.set(right, id);
  }
  return id;
}

/** @typedef {{selector:ActiveSelector,position:number,middle:Normalized,group:FoldGroup,text:string}} FoldOccurrence */
/** @typedef {{occurrences:FoldOccurrence[],orderHeap:FoldOccurrence[],lexHeap:FoldOccurrence[],middleCounts:Map<number,{count:number,middle:Normalized}>,specificity:Specificity,activeCount:number,selectorLength:number,middleLength:number,version:number,sequence:number}} FoldGroup */
/** @typedef {{group:FoldGroup,version:number,savings:number,count:number,first:FoldOccurrence,lex:string}} FoldCandidate */
/** @typedef {Normalized & {active:boolean,order:number,memberships:FoldOccurrence[],previous?:ActiveSelector,next?:ActiveSelector}} ActiveSelector */

/** @param {Normalized} selector @param {SelectorArena} arena */
function arenaUnsafeForFold(selector, arena) {
  const facts =
    selector.node >= 0 ? (arena.nodes[selector.node]?.facts ?? 0) : 0;
  return (
    hasSemanticFact(facts, semanticFacts.vendorPseudo) ||
    hasSemanticFact(facts, semanticFacts.commentDescendant) ||
    selector.parts?.some((part) => 'kind' in part && part.text === '||')
  );
}

/** @param {Normalized} selector @param {SelectorArena} arena */
function selectorCanFold(selector, arena) {
  if (!selector.parts || arenaUnsafeForFold(selector, arena)) return false;
  for (let position = 0; position < selector.parts.length; position += 2) {
    const middle = selector.parts[position];
    if (!('kind' in middle) && middle.foldEligible && middle.specificity)
      return true;
  }
  return false;
}

/** @param {Map<number,Map<number,Map<string,FoldGroup>>>} groups @param {{value:number}} sequence @param {number} prefix @param {number} suffix @param {Normalized} middle */
function foldGroup(groups, sequence, prefix, suffix, middle) {
  const spec = /** @type {Specificity} */ (middle.specificity).join(',');
  let bySuffix = groups.get(prefix);
  if (!bySuffix) {
    bySuffix = new Map();
    groups.set(prefix, bySuffix);
  }
  let bySpec = bySuffix.get(suffix);
  if (!bySpec) {
    bySpec = new Map();
    bySuffix.set(suffix, bySpec);
  }
  let group = bySpec.get(spec);
  if (!group) {
    group = {
      occurrences: [],
      orderHeap: [],
      lexHeap: [],
      middleCounts: new Map(),
      specificity: /** @type {Specificity} */ (middle.specificity),
      activeCount: 0,
      selectorLength: 0,
      middleLength: 0,
      version: 0,
      sequence: sequence.value++,
    };
    bySpec.set(spec, group);
  }
  return group;
}

/** @param {FoldGroup} group */
function activeOccurrences(group) {
  return group.occurrences.filter(({ selector }) => selector.active);
}

/** @param {FoldOccurrence[]} values @param {FoldOccurrence} value @param {(left:FoldOccurrence,right:FoldOccurrence)=>boolean} before */
function pushOccurrence(values, value, before) {
  let index = values.length;
  values.push(value);
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (!before(value, values[parent])) break;
    values[index] = values[parent];
    index = parent;
  }
  values[index] = value;
}

/** @param {FoldOccurrence[]} values @param {(left:FoldOccurrence,right:FoldOccurrence)=>boolean} before */
function popOccurrence(values, before) {
  const last = values.pop();
  if (!last || values.length === 0) return;
  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    if (left >= values.length) break;
    const right = left + 1;
    const child =
      right < values.length && before(values[right], values[left])
        ? right
        : left;
    if (!before(values[child], last)) break;
    values[index] = values[child];
    index = child;
  }
  values[index] = last;
}

/** @param {FoldOccurrence} left @param {FoldOccurrence} right */
function occurrenceOrder(left, right) {
  return (
    left.selector.order < right.selector.order ||
    (left.selector.order === right.selector.order &&
      left.position < right.position)
  );
}

/** @param {FoldOccurrence} left @param {FoldOccurrence} right */
function occurrenceText(left, right) {
  return left.text < right.text;
}

/** @param {FoldOccurrence[]} values @param {(left:FoldOccurrence,right:FoldOccurrence)=>boolean} before */
function activeOccurrence(values, before) {
  while (values[0] && !values[0].selector.active) popOccurrence(values, before);
  return values[0];
}

/** @param {FoldGroup} group @return {FoldCandidate | undefined} */
function foldCandidate(group) {
  if (group.activeCount < 2 || group.middleCounts.size < 2) return;
  const first = activeOccurrence(group.orderHeap, occurrenceOrder);
  const lexical = activeOccurrence(group.lexHeap, occurrenceText);
  if (!first || !lexical) return;
  const foldedLength =
    first.selector.length -
    first.middle.length +
    5 +
    group.middleLength +
    group.middleCounts.size -
    1;
  const originalLength = group.selectorLength + group.activeCount - 1;
  const savings = originalLength - foldedLength;
  if (savings <= 0) return;
  return {
    group,
    version: group.version,
    savings,
    count: group.activeCount,
    first,
    lex: lexical.text,
  };
}

class CandidateHeap {
  /** @param {boolean} sort */
  constructor(sort) {
    /** @type {FoldCandidate[]} */ this.values = [];
    this.sort = sort;
  }

  /** @param {FoldCandidate} left @param {FoldCandidate} right */
  before(left, right) {
    if (!this.sort)
      return (
        left.first.selector.order < right.first.selector.order ||
        (left.first.selector.order === right.first.selector.order &&
          (left.first.position < right.first.position ||
            (left.first.position === right.first.position &&
              left.group.sequence < right.group.sequence)))
      );
    return (
      left.savings > right.savings ||
      (left.savings === right.savings &&
        (left.count > right.count ||
          (left.count === right.count &&
            (left.lex < right.lex ||
              (left.lex === right.lex &&
                (left.first.position < right.first.position ||
                  (left.first.position === right.first.position &&
                    left.group.sequence < right.group.sequence)))))))
    );
  }

  /** @param {FoldCandidate} value */
  push(value) {
    const values = this.values;
    let index = values.length;
    values.push(value);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.before(value, values[parent])) break;
      values[index] = values[parent];
      index = parent;
    }
    values[index] = value;
  }

  pop() {
    const values = this.values;
    const root = values[0];
    const last = values.pop();
    if (!root || !last || values.length === 0) return root;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      if (left >= values.length) break;
      const right = left + 1;
      const child =
        right < values.length && this.before(values[right], values[left])
          ? right
          : left;
      if (!this.before(values[child], last)) break;
      values[index] = values[child];
      index = child;
    }
    values[index] = last;
    return root;
  }
}

/** @param {FoldGroup} group @param {FoldOccurrence} occurrence */
function addOccurrence(group, occurrence) {
  group.occurrences.push(occurrence);
  pushOccurrence(group.orderHeap, occurrence, occurrenceOrder);
  pushOccurrence(group.lexHeap, occurrence, occurrenceText);
  group.activeCount++;
  group.selectorLength += occurrence.selector.length;
  const found = group.middleCounts.get(occurrence.middle.id);
  if (found) found.count++;
  else {
    group.middleCounts.set(occurrence.middle.id, {
      count: 1,
      middle: occurrence.middle,
    });
    group.middleLength += occurrence.middle.length;
  }
  group.version++;
}

/** @param {FoldGroup} group @param {FoldOccurrence} occurrence */
function removeOccurrence(group, occurrence) {
  group.activeCount--;
  group.selectorLength -= occurrence.selector.length;
  const found = group.middleCounts.get(occurrence.middle.id);
  if (!found) throw new Error('missing active fold middle');
  found.count--;
  if (found.count === 0) {
    group.middleCounts.delete(occurrence.middle.id);
    group.middleLength -= occurrence.middle.length;
  }
  group.version++;
}

/** @param {ActiveSelector} selector @param {SelectorArena} arena @param {{pairs:Map<number,Map<number,number>>,next:number}} cons @param {Map<number,Map<number,Map<string,FoldGroup>>>} groups @param {{value:number}} sequence @param {Set<FoldGroup>} touched */
function registerSelector(selector, arena, cons, groups, sequence, touched) {
  const parts = selector.parts;
  if (!parts || !selectorCanFold(selector, arena)) return;
  const prefix = Array(parts.length + 1).fill(0);
  const suffix = Array(parts.length + 1).fill(0);
  for (let index = 0; index < parts.length; index++)
    prefix[index + 1] = consId(cons, prefix[index], parts[index].id);
  for (let index = parts.length - 1; index >= 0; index--)
    suffix[index] = consId(cons, parts[index].id, suffix[index + 1]);
  for (let position = 0; position < parts.length; position += 2) {
    const middle = parts[position];
    if ('kind' in middle || !middle.foldEligible || !middle.specificity)
      continue;
    const group = foldGroup(
      groups,
      sequence,
      prefix[position],
      suffix[position + 1],
      middle
    );
    const occurrence = {
      selector,
      position,
      middle,
      group,
      text: outputText(selector),
    };
    selector.memberships.push(occurrence);
    addOccurrence(group, occurrence);
    touched.add(group);
  }
}

/** @param {OutputPool} pool @param {FoldCandidate} candidate @param {FoldOccurrence[]} occurrences @param {number} order @param {boolean} sort @return {ActiveSelector} */
function buildFoldedSelector(pool, candidate, occurrences, order, sort) {
  const first = candidate.first;
  const original = first.selector;
  const parts = /** @type {Part[]} */ (original.parts);
  const middleSeen = new Set();
  /** @type {Normalized[]} */ const middles = [];
  if (candidate.group.middleCounts.size > 0) {
    for (const occurrence of occurrences) {
      if (middleSeen.has(occurrence.middle.id)) continue;
      middleSeen.add(occurrence.middle.id);
      middles.push(occurrence.middle);
    }
  }
  if (sort) middles.sort(compareOutputs);
  const foldedMiddle = pool.sequence([
    pool.text(':is('),
    joinEntries(pool, middles),
    pool.text(')'),
  ]);
  /** @type {Part[]} */ const newParts = [];
  /** @type {Output[]} */ const output = [];
  for (let index = 0; index < parts.length; index++) {
    let value = parts[index];
    if (index === first.position)
      value = {
        ...foldedMiddle,
        node: -1,
        specificity: candidate.group.specificity,
        foldEligible: false,
      };
    newParts.push(value);
    output.push(value);
  }
  /** @type {Output[]} */ const trailingComments = [];
  for (const occurrence of occurrences) {
    if (occurrence.selector.trailing) {
      trailingComments.push(occurrence.selector.trailing);
    }
  }
  if (trailingComments.length > 0) {
    output.push(...trailingComments);
  }
  return {
    ...pool.sequence(output),
    node: -1,
    parts: newParts,
    active: true,
    order,
    memberships: [],
    trailing:
      trailingComments.length > 0 ? pool.sequence(trailingComments) : undefined,
  };
}

/** @param {CandidateHeap} heap @param {Iterable<FoldGroup>} groups */
function enqueueGroups(heap, groups) {
  for (const group of groups) {
    const candidate = foldCandidate(group);
    if (candidate) heap.push(candidate);
  }
}

/** @param {Normalized[]} selectors @param {SelectorArena} arena */
function canFoldSelectorList(selectors, arena) {
  let eligible = 0;
  for (const selector of selectors) {
    if (selectorCanFold(selector, arena)) eligible++;
    if (eligible === 2) return true;
  }
  return false;
}

/** @param {ActiveSelector[]} consumed @param {Set<FoldGroup>} touched @param {ActiveSelector | undefined} head */
function deactivateSelectors(consumed, touched, head) {
  let nextHead = head;
  for (const selector of consumed) {
    if (!selector.active) continue;
    selector.active = false;
    for (const occurrence of selector.memberships) {
      removeOccurrence(occurrence.group, occurrence);
      touched.add(occurrence.group);
    }
    if (selector.previous) selector.previous.next = selector.next;
    else nextHead = selector.next;
    if (selector.next) selector.next.previous = selector.previous;
  }
  return nextHead;
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {Normalized[]} selectors @param {boolean} sort */
function foldSelectors(arena, pool, selectors, sort) {
  if (selectors.length < 2 || !canFoldSelectorList(selectors, arena))
    return selectors;
  const cons = { pairs: new Map(), next: 1 };
  /** @type {Map<number,Map<number,Map<string,FoldGroup>>>} */ const groups =
    new Map();
  const sequence = { value: 0 };
  const heap = new CandidateHeap(sort);
  /** @type {ActiveSelector[]} */ const active = selectors.map(
    (selector, order) => ({
      ...selector,
      active: true,
      order,
      memberships: [],
    })
  );
  for (let index = 0; index < active.length; index++) {
    const selector = active[index];
    const previous = active[index - 1];
    const next = active[index + 1];
    if (previous) selector.previous = previous;
    if (next) selector.next = next;
  }
  /** @type {ActiveSelector | undefined} */
  let head = active[0];
  const touched = new Set();
  for (const selector of active)
    registerSelector(selector, arena, cons, groups, sequence, touched);
  enqueueGroups(heap, touched);

  while (heap.values.length > 0) {
    const candidate = heap.pop();
    if (!candidate || candidate.version !== candidate.group.version) continue;
    const current = foldCandidate(candidate.group);
    if (!current) continue;
    const occurrences = activeOccurrences(current.group);
    const consumed = occurrences.map(({ selector }) => selector);
    if (consumed.length < 2) continue;
    const first = current.first.selector;
    const replacement = buildFoldedSelector(
      pool,
      current,
      occurrences,
      first.order,
      sort
    );
    replacement.previous = first.previous;
    replacement.next = first;
    if (first.previous) first.previous.next = replacement;
    else head = replacement;
    first.previous = replacement;

    touched.clear();
    head = deactivateSelectors(consumed, touched, head);
    registerSelector(replacement, arena, cons, groups, sequence, touched);
    enqueueGroups(heap, touched);
  }

  /** @type {Normalized[]} */ const result = [];
  let selector = head;
  while (selector) {
    result.push(selector);
    selector = selector.next;
  }
  return result;
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {boolean} outerSort @param {readonly number[]} children */
function normalizedNodeOutput(
  arena,
  pool,
  nodeIndex,
  normalized,
  outerSort,
  children
) {
  const node = arena.nodes[nodeIndex];
  if (node.kind === 'list')
    return listOutput(
      arena,
      pool,
      nodeIndex,
      normalized,
      nodeIndex === 0 && outerSort,
      children
    );
  if (node.kind === 'complex')
    return complexOutput(arena, pool, nodeIndex, normalized, children);
  if (node.kind === 'compound')
    return compoundOutput(arena, pool, nodeIndex, normalized, children);
  if (node.kind === 'qualified-name')
    return qualifiedNameOutput(arena, pool, node, false);
  if (node.kind === 'attribute') return attributeOutput(arena, pool, node);
  if (node.kind === 'pseudo')
    return pseudoOutput(arena, pool, node, normalized);
  if (node.kind === 'class')
    return pool.text(
      `${arena.tokens[node.startToken][1]}${compactTerminalIdent(
        arena,
        node,
        node.startToken + 1
      )}`
    );
  if (node.kind === 'id')
    return pool.text(compactTerminalIdent(arena, node, node.startToken));
  if (node.kind === 'combinator') {
    const value = arena.payloads.combinators[node.payload].value;
    if (value === ' ') return descendantCombinator(arena, pool, node);
    return pool.text(value);
  }
  return rawOutput(arena, pool, node);
}

/** @param {SelectorArena} arena @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {readonly number[]} children @param {Normalized} output */
function addNormalizedNodeSummary(
  arena,
  nodeIndex,
  normalized,
  children,
  output
) {
  const node = arena.nodes[nodeIndex];
  let valid = node.status !== 'invalid';
  let hasPseudoElement = hasSemanticFact(
    node.facts ?? 0,
    semanticFacts.pseudoElement
  );
  if (node.kind === 'pseudo') {
    const payload = arena.payloads.pseudos[node.payload];
    if (payload.argumentGrammar === 'forgiving-selector-list') {
      valid = true;
      hasPseudoElement = false;
    }
  } else if (node.kind === 'list') {
    const payload = arena.payloads.lists[node.payload];
    if (payload.mode === 'forgiving') valid = true;
    hasPseudoElement = children.some(
      (child) => normalized[child]?.hasPseudoElement
    );
  } else if (node.kind === 'compound') {
    valid = children.every((child) => normalized[child]?.valid !== false);
    hasPseudoElement = children.some(
      (child) => normalized[child]?.hasPseudoElement
    );
  } else if (node.kind === 'complex') {
    const recovered =
      node.status === 'invalid' &&
      hasSemanticFact(node.facts ?? 0, semanticFacts.pseudoElement) &&
      children.every((child) => !normalized[child]?.hasPseudoElement);
    valid = node.status !== 'invalid' || Boolean(recovered);
    hasPseudoElement = children.some(
      (child) => normalized[child]?.hasPseudoElement
    );
  }
  const foldEligible = node.kind === 'compound' && isFoldEligible(node);
  if (!valid) output.valid = false;
  if (hasPseudoElement) output.hasPseudoElement = true;
  if (foldEligible) output.foldEligible = true;
  if (node.kind === 'compound' || node.kind === 'complex')
    output.node = nodeIndex;
  if (foldEligible) output.specificity = node.specificity;
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {number} nodeIndex @param {(Normalized | undefined)[]} normalized @param {boolean} outerSort */
function normalizeNode(arena, pool, nodeIndex, normalized, outerSort) {
  const node = arena.nodes[nodeIndex];
  const children =
    node.subtreeEnd === nodeIndex + 1
      ? emptyChildren
      : childrenOf(arena, nodeIndex);
  let output = /** @type {Normalized} */ ({
    ...normalizedNodeOutput(
      arena,
      pool,
      nodeIndex,
      normalized,
      outerSort,
      children
    ),
  });
  if (canReuseSourceNode(arena, nodeIndex, normalized, children, output))
    output = /** @type {Normalized} */ (
      sourceNodeOutput(arena, nodeIndex, output)
    );
  addNormalizedNodeSummary(arena, nodeIndex, normalized, children, output);
  return output;
}

/** @param {SelectorArena} arena @param {OutputPool} pool @param {Normalized[]} entries @param {{sort?:boolean,convertToIs?:boolean,keyframe?:boolean}} options */
function finalizeEntries(arena, pool, entries, options) {
  const sort = options.sort ?? true;
  if (options.keyframe && sort && entries.length > 1)
    entries.sort(compareOutputs);
  if (options.keyframe) {
    for (let index = 0; index < entries.length; index++) {
      const value = outputText(entries[index]);
      if (value.toLowerCase() === 'from')
        entries[index] = { ...pool.text('0%'), node: -1 };
      else if (value === '100%')
        entries[index] = { ...pool.text('to'), node: -1 };
    }
  }
  let folded =
    options.convertToIs && !options.keyframe
      ? foldSelectors(arena, pool, entries, sort)
      : entries;
  if (!options.keyframe && sort && folded.length > 1)
    folded = folded.toSorted(compareOutputs);
  return joinEntries(pool, folded).emit;
}

/**
 * Normalize immutable arena nodes once in iterative postorder.
 * @param {SelectorArena} arena
 * @param {{sort?:boolean,convertToIs?:boolean,keyframe?:boolean,hasDefaultNamespace?:boolean}} [options]
 * @return {Map<number, Emit>}
 */
export function normalizeArena(arena, options = {}) {
  if (arena.nodes.length === 0) return new Map();
  const root = arena.nodes[0];
  if (root.kind === 'raw' || root.status === 'invalid') return new Map();
  if (
    root.status === 'opaque' &&
    arena.nodes.some(
      (node) =>
        node.kind === 'raw' &&
        node.status === 'opaque' &&
        node.startToken === root.startToken &&
        node.endToken === root.endToken
    )
  )
    return new Map();
  const pool = new OutputPool(arena);
  /** @type {(Normalized | undefined)[]} */ const normalized = Array(
    arena.nodes.length
  );
  for (let nodeIndex = arena.nodes.length - 1; nodeIndex >= 0; nodeIndex--) {
    normalized[nodeIndex] = normalizeNode(
      arena,
      pool,
      nodeIndex,
      normalized,
      false
    );
    arena.forEachChild(nodeIndex, (child) => {
      normalized[child] = undefined;
    });
  }

  const rootResult = normalized[0];
  if (!rootResult) throw new Error('arena root was not normalized');
  const entries = rootResult.entries;
  if (entries)
    return new Map([[0, finalizeEntries(arena, pool, entries, options)]]);
  return new Map([[0, rootResult.emit]]);
}
