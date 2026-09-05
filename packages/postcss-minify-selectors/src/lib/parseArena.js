import cssnanoUtils from 'cssnano-utils';
import {
  addSpecificity,
  buildSelectorArena,
  createSemanticFacts,
  SelectorArena,
  zeroSpecificity,
} from './arena.js';
import { pseudoElements, safePseudos, selectorGrammar } from './grammar.js';
import {
  normalizeIdentArgument,
  normalizeIdentListArgument,
  normalizeIdentOrStringList,
  normalizePtNameArgument,
  parseAnPlusB,
} from './argumentParsers.js';

const { TokenType, tokens } = cssnanoUtils;
/** @type {typeof cssnanoUtils.balancedTokens} */
const balancedTokens = cssnanoUtils.balancedTokens;
/** @typedef {import('./arena.js').ListMode} ListMode */
/** @typedef {import('./arena.js').ParseStatus} ParseStatus */
/** @typedef {import('./arena.js').SemanticFacts} SemanticFacts */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {import('./arena.js').QualifiedNamePayload} QualifiedNamePayload */
/** @typedef {NonNullable<ReturnType<typeof balancedTokens>>} Structure */
/** @typedef {Parameters<Parameters<typeof buildSelectorArena>[2]>[0]} Builder */
/** @typedef {{mode?:ListMode,keyframe?:boolean,hasDefaultNamespace?:boolean,structureOnly?:boolean}} ParseContext */
/** @typedef {{kind:'list',start:number,end:number,mode:ListMode,argumentPayload?:number,insideHas:boolean}} ListWork */
/** @typedef {{kind:'complex',start:number,end:number,mode:ListMode,status?:ParseStatus,insideHas:boolean}} ComplexWork */
/** @typedef {{kind:'compound',start:number,end:number,mode:ListMode,insideHas:boolean}} CompoundWork */
/** @typedef {{kind:'pseudo',start:number,end:number,mode:ListMode,insideHas:boolean}} PseudoWork */
/** @typedef {{kind:'attribute',start:number}} AttributeWork */
/** @typedef {{kind:'class'|'id'|'nesting',start:number,end:number}} NamedSimpleWork */
/** @typedef {{kind:'qualified-name',start:number,end:number,payload:QualifiedNamePayload}} QualifiedNameWork */
/** @typedef {{kind:'raw',start:number,end:number,status:ParseStatus}} RawWork */
/** @typedef {{kind:'combinator',start:number,end:number,value:string}} CombinatorWork */
/** @typedef {{kind:'close',node:number,role:'list'|'complex'|'compound'|'pseudo',mode?:ListMode,status?:ParseStatus,facts?:SemanticFacts,specificity?:Specificity}} CloseWork */
/** @typedef {ListWork|ComplexWork|CompoundWork|PseudoWork|AttributeWork|NamedSimpleWork|QualifiedNameWork|RawWork|CombinatorWork|CloseWork} ParseWork */

/** @param {import('./tokenUtils.js').CSSToken | undefined} token */
function isTrivia(token) {
  return (
    token?.[0] === TokenType.Whitespace || token?.[0] === TokenType.Comment
  );
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} start @param {number} end */
function trimTrivia(input, start, end) {
  let first = start;
  let last = end;
  while (first < last && isTrivia(input[first])) first++;
  while (last > first && isTrivia(input[last - 1])) last--;
  return { start: first, end: last };
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} start @param {number} end */
function hasContent(input, start, end) {
  const trimmed = trimTrivia(input, start, end);
  return trimmed.start < trimmed.end;
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index */
function explicitCombinator(input, index) {
  const token = input[index];
  if (token?.[0] !== TokenType.Delim) return;
  if (token[1] === '>' || token[1] === '+' || token[1] === '~')
    return { value: token[1], end: index + 1 };
  if (
    token[1] === '|' &&
    input[index + 1]?.[0] === TokenType.Delim &&
    input[index + 1][1] === '|'
  )
    return { value: '||', end: index + 2 };
}

/** @param {ListMode} mode @param {readonly object[]} parts */
function allowsLeadingCombinator(mode, parts) {
  return mode === 'relative' && parts.length === 0;
}

/** @param {ListMode} mode @param {readonly {kind:string}[]} parts */
function violatesComplexMode(mode, parts) {
  return (
    parts.at(-1)?.kind === 'combinator' ||
    (mode === 'compound-only' &&
      parts.some(({ kind }) => kind === 'combinator'))
  );
}

/** @param {Structure} structure @param {number} start @param {number} end @param {ListMode} mode */
function complexParts(structure, start, end, mode) {
  const input = structure.tokens;
  const trimmed = trimTrivia(input, start, end);
  /** @type {{kind:'compound'|'combinator',start:number,end:number,value?:string}[]} */
  const parts = [];
  let status = /** @type {ParseStatus} */ (
    trimmed.start < trimmed.end ? 'valid' : 'invalid'
  );
  let compoundStart = trimmed.start;
  let index = trimmed.start;
  while (index < trimmed.end) {
    const nestedEnd = structure.endForOpening(index);
    if (nestedEnd !== undefined) {
      index = nestedEnd + 1;
      continue;
    }
    if (isTrivia(input[index])) {
      const triviaStart = index;
      while (index < trimmed.end && isTrivia(input[index])) index++;
      if (explicitCombinator(input, index)) continue;
      if (compoundStart < triviaStart && index < trimmed.end) {
        parts.push({
          kind: 'compound',
          start: compoundStart,
          end: triviaStart,
        });
        parts.push({
          kind: 'combinator',
          start: triviaStart,
          end: index,
          value: ' ',
        });
        compoundStart = index;
      }
      continue;
    }
    const combinator = explicitCombinator(input, index);
    if (!combinator) {
      index++;
      continue;
    }
    let compoundEnd = index;
    while (compoundEnd > compoundStart && isTrivia(input[compoundEnd - 1]))
      compoundEnd--;
    if (compoundStart < compoundEnd)
      parts.push({ kind: 'compound', start: compoundStart, end: compoundEnd });
    else if (!allowsLeadingCombinator(mode, parts)) status = 'invalid';
    parts.push({
      kind: 'combinator',
      start: index,
      end: combinator.end,
      value: combinator.value,
    });
    index = combinator.end;
    while (index < trimmed.end && isTrivia(input[index])) index++;
    compoundStart = index;
  }
  if (compoundStart < trimmed.end)
    parts.push({ kind: 'compound', start: compoundStart, end: trimmed.end });
  if (violatesComplexMode(mode, parts)) status = 'invalid';
  return { parts, status };
}

/** @param {SemanticFacts} target @param {Readonly<SemanticFacts> | undefined} source */
function mergeFacts(target, source) {
  if (!source) return;
  for (const key of Object.keys(target)) {
    const fact = /** @type {keyof SemanticFacts} */ (key);
    target[fact] ||= source[fact];
  }
}

/** @param {ParseStatus} current @param {ParseStatus} child */
function mergeStatus(current, child) {
  if (current === 'invalid' || child === 'invalid') return 'invalid';
  if (current === 'opaque' || child === 'opaque') return 'opaque';
  return 'valid';
}

/** @param {Builder} builder @param {number} nodeIndex */
function directChildren(builder, nodeIndex) {
  /** @type {number[]} */ const result = [];
  let child = nodeIndex + 1;
  while (child < builder.nodes.length) {
    result.push(child);
    child = builder.nodes[child].subtreeEnd;
  }
  return result;
}

/** @param {Specificity} left @param {Specificity} right */
function isGreaterSpecificity(left, right) {
  if (left[0] !== right[0]) return left[0] > right[0];
  if (left[1] !== right[1]) return left[1] > right[1];
  return left[2] > right[2];
}

/** @param {Builder} builder @param {number[]} children @param {ListMode | undefined} mode @param {SemanticFacts} facts */
function summarizeList(builder, children, mode, facts) {
  let hasValid = false;
  let hasInvalid = false;
  let hasOpaque = false;
  /** @type {Specificity} */ let specificity = [0, 0, 0];
  for (const childIndex of children) {
    const child = builder.nodes[childIndex];
    mergeFacts(facts, child.facts);
    hasValid ||= child.status === 'valid';
    hasInvalid ||= child.status === 'invalid';
    hasOpaque ||= child.status === 'opaque';
    if (
      child.status === 'valid' &&
      child.specificity &&
      isGreaterSpecificity(child.specificity, specificity)
    )
      specificity = [...child.specificity];
  }
  let status = /** @type {ParseStatus} */ ('valid');
  if (mode === 'forgiving') status = hasOpaque ? 'opaque' : 'valid';
  else if (hasInvalid) status = 'invalid';
  else if (hasOpaque) status = 'opaque';
  else if (!hasValid) status = 'invalid';
  return { status, specificity, facts };
}

/** @param {ParseStatus} status @param {Specificity} specificity @param {Specificity | undefined} addition */
function accumulateSummary(status, specificity, addition) {
  if (!addition)
    return {
      status: /** @type {ParseStatus} */ (
        status === 'valid' ? 'opaque' : status
      ),
      specificity,
    };
  const result = addSpecificity(specificity, addition);
  if (result.status === 'opaque')
    return {
      status: /** @type {ParseStatus} */ (
        status === 'invalid' ? 'invalid' : 'opaque'
      ),
      specificity,
    };
  return { status, specificity: result.specificity };
}

/** @param {Builder} builder @param {number[]} children @param {ParseStatus} initialStatus @param {Specificity} initialSpecificity @param {SemanticFacts} facts */
function summarizeComplex(
  builder,
  children,
  initialStatus,
  initialSpecificity,
  facts
) {
  let status = initialStatus;
  let specificity = initialSpecificity;
  for (const childIndex of children) {
    const child = builder.nodes[childIndex];
    mergeFacts(facts, child.facts);
    status = mergeStatus(status, child.status);
    if (child.kind === 'combinator') continue;
    ({ status, specificity } = accumulateSummary(
      status,
      specificity,
      child.specificity
    ));
  }
  return { status, specificity, facts };
}

/** @param {Builder} builder @param {import('./arena.js').ArenaNode} child @param {SemanticFacts} facts */
function compoundChildSpecificity(builder, child, facts) {
  if (child.kind === 'id') return /** @type {Specificity} */ ([1, 0, 0]);
  if (child.kind === 'class') return /** @type {Specificity} */ ([0, 1, 0]);
  if (child.kind === 'pseudo') return child.specificity;
  if (child.kind === 'qualified-name') {
    const payload = builder.payloads.qualifiedNames[child.payload];
    if (payload.namespace.kind !== 'absent') facts.hasNamespace = true;
    return /** @type {Specificity} */ (
      payload.subject.kind === 'type' ? [0, 0, 1] : [0, 0, 0]
    );
  }
  if (child.kind === 'raw' && child.status === 'valid')
    return /** @type {Specificity} */ ([0, 0, 0]);
  if (child.kind !== 'attribute') return;
  const payload = builder.payloads.attributes[child.payload];
  if (payload.modifierToken !== undefined) facts.hasAttributeModifier = true;
  if (payload.namespace.kind !== 'absent') facts.hasNamespace = true;
  return /** @type {Specificity} */ ([0, 1, 0]);
}

/** @param {Builder} builder @param {number[]} children @param {ParseStatus} initialStatus @param {Specificity} initialSpecificity @param {SemanticFacts} facts */
function summarizeCompound(
  builder,
  children,
  initialStatus,
  initialSpecificity,
  facts
) {
  let status = initialStatus;
  let specificity = initialSpecificity;
  for (const childIndex of children) {
    const child = builder.nodes[childIndex];
    mergeFacts(facts, child.facts);
    const accumulated = accumulateSummary(
      mergeStatus(status, child.status),
      specificity,
      compoundChildSpecificity(builder, child, facts)
    );
    status = accumulated.status;
    specificity = accumulated.specificity;
  }
  return { status, specificity, facts };
}

/** @param {Builder} builder @param {number[]} children @param {ParseStatus} initialStatus @param {Specificity} initialSpecificity @param {SemanticFacts} facts @param {number} node */
function summarizePseudo(
  builder,
  children,
  initialStatus,
  initialSpecificity,
  facts,
  node
) {
  let status = initialStatus;
  let specificity = initialSpecificity;
  const payload = builder.payloads.pseudos[builder.nodes[node].payload];
  for (const childIndex of children) {
    const child = builder.nodes[childIndex];
    mergeFacts(facts, child.facts);
    status = mergeStatus(status, child.status);
    if (payload.specificityPolicy === 'zero') specificity = [0, 0, 0];
    else if (payload.specificityPolicy === 'argument')
      specificity = child.specificity ? [...child.specificity] : specificity;
    else if (payload.specificityPolicy === 'class-plus-argument')
      ({ status, specificity } = accumulateSummary(
        status,
        [0, 1, 0],
        child.specificity
      ));
    else if (payload.specificityPolicy === 'element-plus-argument')
      ({ status, specificity } = accumulateSummary(
        status,
        [0, 0, 1],
        child.specificity
      ));
  }
  if (payload.name === 'has' && facts.hasNestedHas) status = 'invalid';
  return { status, specificity, facts };
}

/** @param {Builder} builder @param {Extract<ParseWork,{kind:'close'}>} item */
function closeWork(builder, item) {
  const children = directChildren(builder, item.node);
  const facts = { ...(item.facts ?? createSemanticFacts()) };
  const status = item.status ?? 'valid';
  const specificity = /** @type {Specificity} */ ([
    ...(item.specificity ?? zeroSpecificity()),
  ]);
  let summary;
  if (item.role === 'list')
    summary = summarizeList(builder, children, item.mode, facts);
  else if (item.role === 'pseudo')
    summary = summarizePseudo(
      builder,
      children,
      status,
      specificity,
      facts,
      item.node
    );
  else if (item.role === 'complex')
    summary = summarizeComplex(builder, children, status, specificity, facts);
  else
    summary = summarizeCompound(builder, children, status, specificity, facts);
  if (
    item.role === 'complex' &&
    item.mode !== 'outer-unforgiving' &&
    summary.facts.hasPseudoElement
  )
    summary.status = 'invalid';
  builder.closeSummary(item.node, summary);
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index @param {number} end */
function qualifiedNameAt(input, index, end) {
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
    ['~', '|', '^', '$', '*'].includes(prefix) &&
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
    if (cursor === beforeTrivia || (lower !== 'i' && lower !== 's'))
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
function addAttribute(builder, structure, index) {
  const input = structure.tokens;
  const close = structure.endForOpening(index);
  if (close === undefined) return index + 1;
  let cursor = skipTrivia(input, index + 1, close);
  const name = qualifiedNameAt(input, cursor, close);
  let status = /** @type {ParseStatus} */ ('valid');
  if (!name?.end || name.payload.subject.kind !== 'type') status = 'invalid';
  const namespace = name?.end
    ? name.payload.namespace
    : { kind: /** @type {const} */ ('absent') };
  const nameToken = name?.end ? name.payload.subject.token : cursor;
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
function pseudoDetails(structure, start) {
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

/** @param {Builder} builder @param {Structure} structure @param {Extract<ParseWork,{kind:'pseudo'}>} item @param {ParseStatus} status */
function addRawPseudo(builder, structure, item, status) {
  builder.leaf('raw', item.start, item.end, {
    status,
    payload: builder.payload('raw', {
      text: structure.tokens
        .slice(item.start, item.end)
        .map((token) => token[1])
        .join(''),
    }),
  });
}

/** @param {string | undefined} grammar @param {ListMode | undefined} listMode @param {string} name @param {boolean} isElement */
function functionalSpecificityPolicy(grammar, listMode, name, isElement) {
  if (grammar === 'an-plus-b-of' && listMode) return 'class-plus-argument';
  return pseudoSpecificityPolicy(name, listMode, isElement);
}

/** @param {Builder} builder @param {Structure} structure @param {Extract<ParseWork,{kind:'pseudo'}>} item @param {ParseWork[]} work */
function openPseudo(builder, structure, item, work) {
  const details = pseudoDetails(structure, item.start);
  const { name, nameIndex, nameToken, isFunction, functionEnd, isElement } =
    details;
  if (
    !nameToken ||
    (nameToken[0] !== TokenType.Ident && nameToken[0] !== TokenType.Function)
  ) {
    addRawPseudo(builder, structure, item, 'invalid');
    return;
  }
  if (isFunction && !selectorGrammar.has(name)) {
    addRawPseudo(builder, structure, item, 'opaque');
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
  const facts = createSemanticFacts();
  facts.hasFunction = isFunction;
  facts.hasPseudoElement = isElement;
  facts.hasVendorPseudo = name.startsWith('-');
  facts.hasUnsafePseudo = !isElement && !safePseudos.has(name);
  facts.hasNestedHas = name === 'has' && item.insideHas;
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
function pseudoEndAt(structure, index, end) {
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

/** @param {Structure} structure @param {number} index @param {number} end @param {boolean} hasQualifiedName */
function compoundChildAt(
  structure,
  index,
  end,
  hasQualifiedName,
  keyframe = false
) {
  const input = structure.tokens;
  const token = input[index];
  if (token[0] === TokenType.OpenSquare)
    return {
      work: /** @type {ParseWork} */ ({ kind: 'attribute', start: index }),
      end: (structure.endForOpening(index) ?? index) + 1,
    };
  if (token[0] === TokenType.Colon) {
    const pseudoEnd = pseudoEndAt(structure, index, end);
    return {
      work: /** @type {ParseWork} */ ({
        kind: 'pseudo',
        start: index,
        end: pseudoEnd,
      }),
      end: pseudoEnd,
    };
  }
  if (
    token[0] === TokenType.Delim &&
    token[1] === '.' &&
    input[index + 1]?.[0] === TokenType.Ident
  )
    return {
      work: /** @type {ParseWork} */ ({
        kind: 'class',
        start: index,
        end: index + 2,
      }),
      end: index + 2,
    };
  if (token[0] === TokenType.Hash)
    return {
      work: /** @type {ParseWork} */ ({
        kind: 'id',
        start: index,
        end: index + 1,
      }),
      end: index + 1,
    };
  if (keyframe && token[0] === TokenType.Percentage)
    return {
      work: /** @type {ParseWork} */ ({
        kind: 'raw',
        start: index,
        end: index + 1,
        status: 'valid',
      }),
      end: index + 1,
    };
  if (token[0] === TokenType.Delim && token[1] === '&')
    return {
      work: /** @type {ParseWork} */ ({
        kind: 'nesting',
        start: index,
        end: index + 1,
      }),
      end: index + 1,
      status: /** @type {ParseStatus} */ ('opaque'),
    };
  const qualified = qualifiedNameAt(input, index, end);
  if (qualified?.end && !hasQualifiedName)
    return {
      work: /** @type {ParseWork} */ ({
        kind: 'qualified-name',
        start: index,
        end: qualified.end,
        payload: qualified.payload,
      }),
      end: qualified.end,
      hasQualifiedName: true,
    };
  return {
    work: /** @type {ParseWork} */ ({
      kind: 'raw',
      start: index,
      end: index + 1,
      status: 'invalid',
    }),
    end: index + 1,
    status: /** @type {ParseStatus} */ ('invalid'),
  };
}

/** @param {Structure} structure @param {number} start @param {number} end @param {ListMode} mode @param {boolean} insideHas */
function compoundChildren(
  structure,
  start,
  end,
  mode,
  insideHas,
  keyframe = false
) {
  /** @type {ParseWork[]} */ const children = [];
  let status = /** @type {ParseStatus} */ ('valid');
  let index = start;
  let hasQualifiedName = false;
  while (index < end) {
    const child = compoundChildAt(
      structure,
      index,
      end,
      hasQualifiedName || index !== start,
      keyframe
    );
    if (child.work.kind === 'pseudo') {
      child.work.mode = mode;
      child.work.insideHas = insideHas;
    }
    children.push(child.work);
    status = mergeStatus(status, child.status ?? 'valid');
    hasQualifiedName ||= child.hasQualifiedName ?? false;
    index = child.end;
  }
  return { status, children };
}

/** @param {Builder} builder @param {ParseWork} item @param {Structure} structure @param {ParseWork[]} work */
function addLeafWork(builder, item, structure, work) {
  if (item.kind === 'attribute') addAttribute(builder, structure, item.start);
  else if (item.kind === 'pseudo') openPseudo(builder, structure, item, work);
  else if (item.kind === 'class') builder.leaf('class', item.start, item.end);
  else if (item.kind === 'id') builder.leaf('id', item.start, item.end);
  else if (item.kind === 'nesting')
    builder.leaf('nesting', item.start, item.end, { status: 'opaque' });
  else if (item.kind === 'qualified-name')
    builder.leaf('qualified-name', item.start, item.end, {
      payload: builder.payload('qualifiedNames', item.payload),
    });
  else if (item.kind === 'raw')
    builder.leaf('raw', item.start, item.end, {
      status: item.status,
      payload: builder.payload('raw', {
        text: structure.tokens
          .slice(item.start, item.end)
          .map((token) => token[1])
          .join(''),
      }),
    });
}

/** @param {string} source @param {ParseContext} [context] */
export function parseSelectorArena(source, context = {}) {
  const mode = context.mode ?? 'outer-unforgiving';
  const keyframe = context.keyframe ?? false;
  const hasDefaultNamespace = context.hasDefaultNamespace ?? false;
  const structure = balancedTokens(source);
  if (!structure) {
    const input = tokens(source);
    return buildSelectorArena(source, input, (builder) => {
      builder.leaf('raw', 0, input.length, {
        status: 'opaque',
        payload: builder.payload('raw', { text: source }),
      });
    });
  }
  const input = structure.tokens;
  if (context.structureOnly) {
    return new SelectorArena(
      source,
      input,
      [
        {
          kind: 'raw',
          startToken: 0,
          endToken: input.length,
          subtreeEnd: 1,
          status: 'opaque',
          payload: 0,
        },
      ],
      {
        lists: [],
        combinators: [],
        qualifiedNames: [],
        pseudos: [],
        attributes: [],
        raw: [{ text: source }],
      },
      structure
    );
  }
  return buildSelectorArena(
    source,
    input,
    (builder) => {
      /** @type {ParseWork[]} */ const work = [
        { kind: 'list', start: 0, end: input.length, mode, insideHas: false },
      ];
      while (work.length > 0) {
        const item = work.pop();
        if (!item) break;
        if (item.kind === 'close') closeWork(builder, item);
        else if (item.kind === 'list') {
          const node = builder.open('list', item.start, item.end, {
            payload: builder.payload('lists', {
              mode: item.mode,
              keyframe,
              hasDefaultNamespace,
            }),
          });
          if (item.argumentPayload !== undefined)
            builder.payloads.pseudos[item.argumentPayload].argumentNode = node;
          work.push({ kind: 'close', node, role: 'list', mode: item.mode });
          const segments = structure.topLevelSegments(
            item.start,
            item.end,
            TokenType.Comma
          );
          for (let index = segments.length - 1; index >= 0; index--) {
            const segment = segments[index];
            work.push({
              kind: 'complex',
              start: segment.startIndex,
              end: segment.endIndex,
              mode: item.mode,
              insideHas: item.insideHas,
              status: hasContent(input, segment.startIndex, segment.endIndex)
                ? 'valid'
                : 'invalid',
            });
          }
        } else if (item.kind === 'complex') {
          const parsed = complexParts(
            structure,
            item.start,
            item.end,
            item.mode
          );
          const facts = createSemanticFacts();
          facts.hasCommentDescendant = parsed.parts.some(
            (part) =>
              part.kind === 'combinator' &&
              part.value === ' ' &&
              input
                .slice(part.start, part.end)
                .some(
                  (token) =>
                    token[0] === TokenType.Comment &&
                    !token[1].startsWith('/*!')
                )
          );
          const node = builder.open('complex', item.start, item.end, {
            status: mergeStatus(item.status ?? 'valid', parsed.status),
            facts,
          });
          work.push({
            kind: 'close',
            node,
            role: 'complex',
            status: builder.nodes[node].status,
            facts,
            mode: item.mode,
          });
          for (let index = parsed.parts.length - 1; index >= 0; index--) {
            const part = parsed.parts[index];
            work.push(
              part.kind === 'compound'
                ? {
                    kind: 'compound',
                    start: part.start,
                    end: part.end,
                    mode: item.mode,
                    insideHas: item.insideHas,
                  }
                : {
                    kind: 'combinator',
                    start: part.start,
                    end: part.end,
                    value: part.value ?? '',
                  }
            );
          }
        } else if (item.kind === 'compound') {
          const facts = createSemanticFacts();
          const node = builder.open('compound', item.start, item.end, {
            facts,
          });
          const parsed = compoundChildren(
            structure,
            item.start,
            item.end,
            item.mode,
            item.insideHas,
            keyframe
          );
          if (
            hasDefaultNamespace &&
            parsed.children.some(
              (child) =>
                child.kind === 'qualified-name' &&
                child.payload.namespace?.kind === 'absent' &&
                child.payload.subject?.kind === 'universal'
            )
          )
            facts.hasNamespace = true;
          work.push({
            kind: 'close',
            node,
            role: 'compound',
            status: parsed.status,
            facts,
          });
          for (let index = parsed.children.length - 1; index >= 0; index--)
            work.push(parsed.children[index]);
        } else if (item.kind === 'combinator') {
          builder.leaf('combinator', item.start, item.end, {
            payload: builder.payload('combinators', { value: item.value }),
          });
        } else addLeafWork(builder, item, structure, work);
      }
    },
    structure
  );
}
