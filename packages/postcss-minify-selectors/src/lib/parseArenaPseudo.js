import cssnanoUtils from 'cssnano-utils';
import {
  addSemanticFact,
  createSemanticFacts,
  semanticFacts,
} from './arena.js';
import { pseudoElements, safePseudos, selectorGrammar } from './grammar.js';
import {
  normalizeIdentArgument,
  normalizeIdentListArgument,
  normalizeIdentOrStringList,
  normalizePtNameArgument,
  parseAnPlusB,
} from './argumentParsers.js';
import { isTrivia, mergeStatus } from './parseArenaStructure.js';

const { TokenType } = cssnanoUtils;
/** @typedef {import('./arena.js').ListMode} ListMode */
/** @typedef {import('./arena.js').ParseStatus} ParseStatus */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {import('./arena.js').QualifiedNamePayload} QualifiedNamePayload */
/** @typedef {NonNullable<ReturnType<typeof cssnanoUtils.balancedTokens>>} Structure */
/** @typedef {Parameters<Parameters<typeof import('./arena.js').buildSelectorArena>[2]>[0]} Builder */
/** @typedef {{kind:'list',start:number,end:number,mode:ListMode,argumentPayload?:number,insideHas:boolean}} ListWork */
/** @typedef {{kind:'pseudo',start:number,end:number,mode:ListMode,insideHas:boolean}} PseudoWork */
/** @typedef {{kind:'close',node:number,role:'pseudo',status?:ParseStatus,facts?:import('./arena.js').SemanticFacts,specificity?:Specificity}} CloseWork */
/** @typedef {PseudoWork|ListWork|CloseWork} ParseWork */

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index @param {number} end */
export function qualifiedNameAt(input, index, end) {
  const first = input[index];
  const isName = isQualifiedNameToken(first);
  const empty =
    first?.[0] === TokenType.Delim &&
    first[1] === '|' &&
    input[index + 1]?.[1] !== '|';
  if (!isName && !empty) return;
  let subjectIndex = index;
  let namespace =
    /** @type {{kind:'absent'}|{kind:'empty'}|{kind:'wildcard'}|{kind:'named',token:number}} */ ({
      kind: 'absent',
    });
  if (empty) {
    namespace = { kind: 'empty' };
    subjectIndex = index + 1;
  } else if (input[index + 1]?.[1] === '|' && input[index + 2]?.[1] !== '|') {
    namespace =
      first[1] === '*' ? { kind: 'wildcard' } : { kind: 'named', token: index };
    subjectIndex = index + 2;
  }
  const subject = input[subjectIndex];
  if (subjectIndex >= end || !isQualifiedNameToken(subject))
    return { invalidEnd: Math.min(subjectIndex + 1, end) };
  return {
    end: subjectIndex + 1,
    payload: {
      namespace,
      subject:
        subject[1] === '*'
          ? { kind: /** @type {const} */ ('universal'), token: subjectIndex }
          : { kind: /** @type {const} */ ('type'), token: subjectIndex },
    },
  };
}

/** @param {import('./tokenUtils.js').CSSToken | undefined} token */
function isQualifiedNameToken(token) {
  return (
    token?.[0] === TokenType.Ident ||
    (token?.[0] === TokenType.Delim && token[1] === '*')
  );
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index @param {number} end */
function skipTrivia(input, index, end) {
  let cursor = index;
  while (cursor < end && isTrivia(input[cursor])) cursor++;
  return cursor;
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index */
function attributeMatcher(input, index) {
  if (input[index]?.[1] === '=') return { matcher: '=', end: index + 1 };
  const prefix = input[index]?.[1];
  if (
    (prefix === '~' ||
      prefix === '|' ||
      prefix === '^' ||
      prefix === '$' ||
      prefix === '*') &&
    input[index + 1]?.[1] === '='
  )
    return { matcher: `${prefix}=`, end: index + 2 };
  return { matcher: undefined, end: index };
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index @param {number} end */
function attributeValue(input, index, end) {
  let cursor = skipTrivia(input, index, end);
  if (
    input[cursor]?.[0] !== TokenType.Ident &&
    input[cursor]?.[0] !== TokenType.String
  )
    return { status: /** @type {ParseStatus} */ ('invalid'), cursor };
  const valueToken = cursor++;
  const beforeTrivia = cursor;
  cursor = skipTrivia(input, cursor, end);
  let modifierToken;
  let caseBehavior =
    /** @type {'default'|'ascii-insensitive'|'case-sensitive'} */ ('default');
  if (input[cursor]?.[0] === TokenType.Ident) {
    const lower = decodedIdent(input[cursor]);
    if (
      (input[valueToken]?.[0] === TokenType.Ident && cursor === beforeTrivia) ||
      (lower !== 'i' && lower !== 's')
    )
      return { status: /** @type {ParseStatus} */ ('invalid'), cursor };
    modifierToken = cursor++;
    caseBehavior = lower === 'i' ? 'ascii-insensitive' : 'case-sensitive';
  }
  return {
    status: /** @type {ParseStatus} */ ('valid'),
    cursor,
    valueToken,
    modifierToken,
    caseBehavior,
  };
}

/** @param {Builder} builder @param {Structure} structure @param {number} index */
// eslint-disable-next-line complexity
export function addAttribute(builder, structure, index) {
  const input = structure.tokens;
  const close = structure.endForOpening(index);
  if (close === undefined) return index + 1;
  let cursor = skipTrivia(input, index + 1, close);
  const name =
    input[cursor]?.[0] === TokenType.Ident &&
    input[cursor + 1]?.[1] === '|' &&
    input[cursor + 2]?.[1] === '='
      ? {
          end: cursor + 1,
          payload: {
            namespace: { kind: /** @type {const} */ ('absent') },
            subject: {
              kind: /** @type {const} */ ('type'),
              token: cursor,
            },
          },
        }
      : qualifiedNameAt(input, cursor, close);
  let status = /** @type {ParseStatus} */ ('valid');
  if (
    !name?.end ||
    /** @type {QualifiedNamePayload} */ (name.payload).subject.kind !== 'type'
  )
    status = 'invalid';
  const namespace = name?.end
    ? /** @type {QualifiedNamePayload} */ (name.payload).namespace
    : { kind: /** @type {const} */ ('absent') };
  const nameToken = name?.end
    ? /** @type {QualifiedNamePayload} */ (name.payload).subject.token
    : cursor;
  cursor = name?.end ? skipTrivia(input, name.end, close) : close;
  const parsedMatcher = attributeMatcher(input, cursor);
  const matcher = parsedMatcher.matcher;
  cursor = parsedMatcher.end;
  let valueToken;
  let modifierToken;
  let caseBehavior =
    /** @type {'default'|'ascii-insensitive'|'case-sensitive'} */ ('default');
  if (matcher) {
    const value = attributeValue(input, cursor, close);
    status = mergeStatus(status, value.status);
    cursor = value.cursor;
    valueToken = value.valueToken;
    modifierToken = value.modifierToken;
    caseBehavior = value.caseBehavior ?? caseBehavior;
  }
  cursor = skipTrivia(input, cursor, close);
  if (cursor !== close) status = 'invalid';
  builder.leaf('attribute', index, close + 1, {
    status,
    payload: builder.payload('attributes', {
      namespace,
      nameToken,
      matcher,
      valueToken,
      modifierToken,
      caseBehavior,
    }),
  });
  return close + 1;
}

/** @param {string | undefined} grammar */
function listModeForGrammar(grammar) {
  if (grammar === 'forgiving-selector-list')
    return /** @type {const} */ ('forgiving');
  if (grammar === 'selector-list') return /** @type {const} */ ('unforgiving');
  if (grammar === 'relative-selector-list')
    return /** @type {const} */ ('relative');
  if (grammar === 'compound-selector')
    return /** @type {const} */ ('compound-only');
}

/** @param {string} name @param {ListMode | undefined} listMode @param {boolean} isElement */
function pseudoSpecificityPolicy(name, listMode, isElement) {
  if (name === 'where') return 'zero';
  if (!listMode) return 'normal';
  if (name === 'host' || name === 'host-context') return 'class-plus-argument';
  return isElement ? 'element-plus-argument' : 'argument';
}

/** @param {import('./tokenUtils.js').CSSToken} token */
function decodedIdent(token) {
  const metadata = /** @type {{value?:string} | undefined} */ (token[4]);
  return (metadata?.value ?? token[1]).toLowerCase();
}

/** @param {Structure} structure @param {number} start @param {number} end */
function findNthOf(structure, start, end) {
  for (let index = start; index < end; index++) {
    const nestedEnd = structure.endForOpening(index);
    if (nestedEnd !== undefined) {
      index = nestedEnd;
      continue;
    }
    const token = structure.tokens[index];
    if (token[0] === TokenType.Ident && decodedIdent(token) === 'of')
      return index;
  }
  return -1;
}

/** @param {string | undefined} grammar @param {Structure} structure @param {number} start @param {number} end @param {boolean} isElement */
function microArgumentSummary(grammar, structure, start, end, isElement) {
  const input = structure.tokens;
  let result;
  if (grammar === 'an-plus-b') result = parseAnPlusB(input, start, end);
  else if (grammar === 'ident')
    result = normalizeIdentArgument(input, start, end);
  else if (grammar === 'ident-list')
    result = normalizeIdentListArgument(input, start, end);
  else if (grammar === 'ident-or-string-list')
    result = normalizeIdentOrStringList(input, start, end);
  else if (grammar === 'pt-name-selector')
    result = normalizePtNameArgument(input, start, end);
  else return;
  const valid = result !== undefined && !('valid' in result && !result.valid);
  let specificity = /** @type {Specificity} */ (
    isElement ? [0, 0, 1] : [0, 1, 0]
  );
  if (grammar === 'pt-name-selector' && result && 'specificity' in result)
    specificity =
      /** @type {Specificity | undefined} */ (result.specificity) ??
      specificity;
  return {
    status: /** @type {ParseStatus} */ (valid ? 'valid' : 'invalid'),
    specificity,
  };
}

/** @param {string | undefined} grammar @param {Structure} structure @param {number} start @param {number} end @param {boolean} isElement */
function pseudoArgumentSummary(grammar, structure, start, end, isElement) {
  if (grammar !== 'an-plus-b-of')
    return {
      ...microArgumentSummary(grammar, structure, start, end, isElement),
      listMode: listModeForGrammar(grammar),
      listStart: start,
    };
  const ofIndex = findNthOf(structure, start, end);
  const formulaEnd = ofIndex < 0 ? end : ofIndex;
  const valid = parseAnPlusB(structure.tokens, start, formulaEnd) !== undefined;
  return {
    status: /** @type {ParseStatus} */ (valid ? 'valid' : 'invalid'),
    specificity: /** @type {Specificity} */ ([0, 1, 0]),
    listMode: ofIndex < 0 ? undefined : /** @type {const} */ ('unforgiving'),
    listStart: ofIndex + 1,
  };
}

/** @param {Structure} structure @param {number} start */
export function pseudoDetails(structure, start) {
  const input = structure.tokens;
  const hasDoubleColon = input[start + 1]?.[0] === TokenType.Colon;
  const nameIndex = start + (hasDoubleColon ? 2 : 1);
  const nameToken = input[nameIndex];
  const isFunction = nameToken?.[0] === TokenType.Function;
  const name = nameToken ? decodedIdent(nameToken) : '';
  return {
    nameIndex,
    nameToken,
    isFunction,
    name,
    functionEnd: isFunction ? structure.endForOpening(nameIndex) : undefined,
    isElement: hasDoubleColon || pseudoElements.has(name),
    colonCount: /** @type {1|2} */ (hasDoubleColon ? 2 : 1),
  };
}

/** @param {Builder} builder @param {Extract<ParseWork,{kind:'pseudo'}>} item @param {ParseStatus} status */
function addRawPseudo(builder, item, status) {
  builder.leaf('raw', item.start, item.end, {
    status,
  });
}

/** @param {string | undefined} grammar @param {ListMode | undefined} listMode @param {string} name @param {boolean} isElement */
function functionalSpecificityPolicy(grammar, listMode, name, isElement) {
  if (grammar === 'an-plus-b-of' && listMode) return 'class-plus-argument';
  return pseudoSpecificityPolicy(name, listMode, isElement);
}

/** @param {string} name @param {boolean} isFunction @param {boolean} isElement @param {boolean} insideHas */
function pseudoFacts(name, isFunction, isElement, insideHas) {
  let facts = createSemanticFacts();
  if (isFunction) facts = addSemanticFact(facts, semanticFacts.function);
  if (isElement) facts = addSemanticFact(facts, semanticFacts.pseudoElement);
  if (name.startsWith('-'))
    facts = addSemanticFact(facts, semanticFacts.vendorPseudo);
  if (!isElement && !safePseudos.has(name))
    facts = addSemanticFact(facts, semanticFacts.unsafePseudo);
  if (name === 'has' && insideHas)
    facts = addSemanticFact(facts, semanticFacts.nestedHas);
  return facts;
}

/** @param {Builder} builder @param {Structure} structure @param {Extract<ParseWork,{kind:'pseudo'}>} item @param {unknown[]} work */
export function openPseudo(builder, structure, item, work) {
  const details = pseudoDetails(structure, item.start);
  const { name, nameIndex, nameToken, isFunction, functionEnd, isElement } =
    details;
  if (
    !nameToken ||
    (nameToken[0] !== TokenType.Ident && nameToken[0] !== TokenType.Function)
  ) {
    addRawPseudo(builder, item, 'invalid');
    return;
  }
  if (isFunction && !selectorGrammar.has(name)) {
    addRawPseudo(builder, item, 'opaque');
    return;
  }
  const grammar = isFunction ? selectorGrammar.get(name) : undefined;
  const argument = pseudoArgumentSummary(
    grammar,
    structure,
    nameIndex + 1,
    functionEnd ?? nameIndex + 1,
    isElement
  );
  const listMode = argument.listMode;
  const payloadIndex = builder.payload('pseudos', {
    name,
    nameToken: nameIndex,
    colonCount: details.colonCount,
    pseudoKind: isElement ? 'element' : 'class',
    specificityPolicy: functionalSpecificityPolicy(
      grammar,
      listMode,
      name,
      isElement
    ),
    argumentGrammar: grammar,
    argumentNode: undefined,
  });
  const facts = pseudoFacts(name, isFunction, isElement, item.insideHas);
  const specificity =
    argument.specificity ??
    /** @type {Specificity} */ (isElement ? [0, 0, 1] : [0, 1, 0]);
  const node = builder.open('pseudo', item.start, item.end, {
    status: argument.status ?? 'valid',
    payload: payloadIndex,
    facts,
    specificity,
  });
  work.push({
    kind: 'close',
    node,
    role: 'pseudo',
    status: argument.status,
    facts,
    specificity,
  });
  if (listMode && functionEnd !== undefined)
    work.push({
      kind: 'list',
      start: argument.listStart,
      end: functionEnd,
      mode: listMode,
      argumentPayload: payloadIndex,
      insideHas: item.insideHas || name === 'has',
    });
}

/** @param {Structure} structure @param {number} index @param {number} end */
export function pseudoEndAt(structure, index, end) {
  const input = structure.tokens;
  const nameIndex =
    input[index + 1]?.[0] === TokenType.Colon ? index + 2 : index + 1;
  const functionEnd =
    input[nameIndex]?.[0] === TokenType.Function
      ? structure.endForOpening(nameIndex)
      : undefined;
  return functionEnd === undefined
    ? Math.min(nameIndex + 1, end)
    : functionEnd + 1;
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index */
