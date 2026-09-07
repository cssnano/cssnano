import cssnanoUtils from 'cssnano-utils';
import {
  addSemanticFact,
  addSpecificity,
  createSemanticFacts,
  hasSemanticFact,
  mergeSemanticFacts,
  semanticFacts,
  zeroSpecificity,
} from './arena.js';

const { TokenType } = cssnanoUtils;
/** @typedef {import('./arena.js').ListMode} ListMode */
/** @typedef {import('./arena.js').ParseStatus} ParseStatus */
/** @typedef {import('./arena.js').SemanticFacts} SemanticFacts */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {Parameters<Parameters<typeof import('./arena.js').buildSelectorArena>[2]>[0]} Builder */
/** @typedef {NonNullable<ReturnType<typeof cssnanoUtils.balancedTokens>>} Structure */
/** @typedef {{kind:'list',start:number,end:number,mode:ListMode,argumentPayload?:number,insideHas:boolean}} ListWork */
/** @typedef {{kind:'complex',start:number,end:number,mode:ListMode,status?:ParseStatus,insideHas:boolean}} ComplexWork */
/** @typedef {{kind:'compound',start:number,end:number,mode:ListMode,insideHas:boolean}} CompoundWork */
/** @typedef {{kind:'pseudo',start:number,end:number,mode:ListMode,insideHas:boolean}} PseudoWork */
/** @typedef {{kind:'close',node:number,role:'list'|'complex'|'compound'|'pseudo',mode?:ListMode,status?:ParseStatus,facts?:SemanticFacts,specificity?:Specificity}} CloseWork */
/** @typedef {ListWork|ComplexWork|CompoundWork|PseudoWork|CloseWork} ParseWork */

/** @param {import('./tokenUtils.js').CSSToken} token */
function decodedIdent(token) {
  const metadata = /** @type {{value?:string} | undefined} */ (token[4]);
  return (metadata?.value ?? token[1]).toLowerCase();
}

/** @param {import('./tokenUtils.js').CSSToken | undefined} token */
export function isTrivia(token) {
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
export function hasContent(input, start, end) {
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
  if (
    token[1] === '/' &&
    decodedIdent(input[index + 1]) === 'deep' &&
    input[index + 2]?.[0] === TokenType.Delim &&
    input[index + 2][1] === '/'
  )
    return { value: '/deep/', end: index + 3 };
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

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} start @param {number} end */
function scanComplexTrivia(input, start, end) {
  let index = start;
  let hasOrdinaryComment = false;
  while (index < end && isTrivia(input[index])) {
    const token = input[index];
    if (token[0] === TokenType.Comment && !token[1].startsWith('/*!'))
      hasOrdinaryComment = true;
    index++;
  }
  return { index, hasOrdinaryComment };
}

/** @param {Structure} structure @param {number} start @param {number} end @param {ListMode} mode */
export function complexParts(structure, start, end, mode) {
  const input = structure.tokens;
  const trimmed = trimTrivia(input, start, end);
  /** @type {{kind:'compound'|'combinator',start:number,end:number,value?:string}[]} */
  const parts = [];
  let status = /** @type {ParseStatus} */ (
    trimmed.start < trimmed.end ? 'valid' : 'invalid'
  );
  let compoundStart = trimmed.start;
  let index = trimmed.start;
  let commentDescendant = false;
  while (index < trimmed.end) {
    const nestedEnd = structure.endForOpening(index);
    if (nestedEnd !== undefined) {
      index = nestedEnd + 1;
      continue;
    }
    if (isTrivia(input[index])) {
      const triviaStart = index;
      const trivia = scanComplexTrivia(input, index, trimmed.end);
      index = trivia.index;
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
        commentDescendant ||= trivia.hasOrdinaryComment;
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
  return { parts, status, commentDescendant };
}

/** @param {ParseStatus} current @param {ParseStatus} child */
export function mergeStatus(current, child) {
  if (current === 'invalid' || child === 'invalid') return 'invalid';
  if (current === 'opaque' || child === 'opaque') return 'opaque';
  return 'valid';
}

/** @param {Specificity} left @param {Specificity} right */
function isGreaterSpecificity(left, right) {
  if (left[0] !== right[0]) return left[0] > right[0];
  if (left[1] !== right[1]) return left[1] > right[1];
  return left[2] > right[2];
}

/** @param {Builder} builder @param {number} nodeIndex @param {ListMode | undefined} mode @param {SemanticFacts} initialFacts */
function summarizeList(builder, nodeIndex, mode, initialFacts) {
  let facts = initialFacts;
  let hasValid = false;
  let hasInvalid = false;
  let hasOpaque = false;
  /** @type {Specificity} */ let specificity = [0, 0, 0];
  let childCount = 0;
  for (
    let childIndex = nodeIndex + 1;
    childIndex < builder.nodes.length;
    childIndex = builder.nodes[childIndex].subtreeEnd
  ) {
    childCount++;
    const child = builder.nodes[childIndex];
    facts = mergeSemanticFacts(facts, child.facts ?? 0);
    hasValid ||= child.status === 'valid';
    hasInvalid ||= child.status === 'invalid';
    hasOpaque ||= child.status === 'opaque';
    if (
      child.status === 'valid' &&
      child.specificity &&
      isGreaterSpecificity(child.specificity, specificity)
    )
      specificity = child.specificity;
  }
  let status = /** @type {ParseStatus} */ ('valid');
  if (mode === 'compound-only' && childCount !== 1) status = 'invalid';
  else if (mode === 'forgiving') status = hasOpaque ? 'opaque' : 'valid';
  else if (hasInvalid) status = 'invalid';
  else if (hasOpaque) status = 'opaque';
  else if (!hasValid) status = 'invalid';
  return { status, specificity, facts };
}

/** @param {import('./tokenUtils.js').CSSToken | undefined} token */
export function isIdentifierContinuationToken(token) {
  if (!token) return false;
  if (token[0] === TokenType.Number || token[0] === TokenType.Dimension)
    return true;
  return token[0] === TokenType.Delim && (token[1].codePointAt(0) ?? 0) >= 0x80;
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

/** @param {Builder} builder @param {number} nodeIndex @param {ParseStatus} initialStatus @param {Specificity} initialSpecificity @param {SemanticFacts} initialFacts */
function summarizeComplex(
  builder,
  nodeIndex,
  initialStatus,
  initialSpecificity,
  initialFacts
) {
  let status = initialStatus;
  let specificity = initialSpecificity;
  let facts = initialFacts;
  for (
    let childIndex = nodeIndex + 1;
    childIndex < builder.nodes.length;
    childIndex = builder.nodes[childIndex].subtreeEnd
  ) {
    const child = builder.nodes[childIndex];
    facts = mergeSemanticFacts(facts, child.facts ?? 0);
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

/** @param {Builder} builder @param {import('./arena.js').ArenaNode} child */
function compoundChildSpecificity(builder, child) {
  if (child.kind === 'id') return /** @type {Specificity} */ ([1, 0, 0]);
  if (child.kind === 'class') return /** @type {Specificity} */ ([0, 1, 0]);
  if (child.kind === 'pseudo') return child.specificity;
  if (child.kind === 'qualified-name') {
    const payload = builder.payloads.qualifiedNames[child.payload];
    return /** @type {Specificity} */ (
      payload.subject.kind === 'type' ? [0, 0, 1] : [0, 0, 0]
    );
  }
  if (child.kind === 'raw' && child.status === 'valid')
    return /** @type {Specificity} */ ([0, 0, 0]);
  if (child.kind !== 'attribute') return;
  return /** @type {Specificity} */ ([0, 1, 0]);
}

/** @param {Builder} builder @param {number} nodeIndex @param {ParseStatus} initialStatus @param {Specificity} initialSpecificity @param {SemanticFacts} initialFacts */
function summarizeCompound(
  builder,
  nodeIndex,
  initialStatus,
  initialSpecificity,
  initialFacts
) {
  let status = initialStatus;
  let specificity = initialSpecificity;
  let facts = initialFacts;
  for (
    let childIndex = nodeIndex + 1;
    childIndex < builder.nodes.length;
    childIndex = builder.nodes[childIndex].subtreeEnd
  ) {
    const child = builder.nodes[childIndex];
    facts = mergeSemanticFacts(facts, child.facts ?? 0);
    if (child.kind === 'qualified-name') {
      const payload = builder.payloads.qualifiedNames[child.payload];
      if (payload.namespace.kind !== 'absent')
        facts = addSemanticFact(facts, semanticFacts.namespace);
    } else if (child.kind === 'attribute') {
      const payload = builder.payloads.attributes[child.payload];
      if (payload.modifierToken !== undefined)
        facts = addSemanticFact(facts, semanticFacts.attributeModifier);
      if (payload.namespace.kind !== 'absent')
        facts = addSemanticFact(facts, semanticFacts.namespace);
    } else if (child.kind === 'nesting')
      facts = addSemanticFact(facts, semanticFacts.nesting);
    const accumulated = accumulateSummary(
      mergeStatus(status, child.status),
      specificity,
      compoundChildSpecificity(builder, child)
    );
    status = accumulated.status;
    specificity = accumulated.specificity;
  }
  return { status, specificity, facts };
}

/** @param {Builder} builder @param {number} nodeIndex @param {ParseStatus} initialStatus @param {Specificity} initialSpecificity @param {SemanticFacts} initialFacts */
function summarizePseudo(
  builder,
  nodeIndex,
  initialStatus,
  initialSpecificity,
  initialFacts
) {
  let status = initialStatus;
  let specificity = initialSpecificity;
  let facts = initialFacts;
  const payload = builder.payloads.pseudos[builder.nodes[nodeIndex].payload];
  for (
    let childIndex = nodeIndex + 1;
    childIndex < builder.nodes.length;
    childIndex = builder.nodes[childIndex].subtreeEnd
  ) {
    const child = builder.nodes[childIndex];
    facts = mergeSemanticFacts(facts, child.facts ?? 0);
    status = mergeStatus(status, child.status);
    if (payload.specificityPolicy === 'zero') specificity = [0, 0, 0];
    else if (payload.specificityPolicy === 'argument')
      specificity = child.specificity
        ? /** @type {Specificity} */ ([...child.specificity])
        : specificity;
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
  if (payload.name === 'has' && hasSemanticFact(facts, semanticFacts.nestedHas))
    status = 'invalid';
  return { status, specificity, facts };
}

/** @param {Builder} builder @param {Extract<ParseWork,{kind:'close'}>} item */
export function closeWork(builder, item) {
  const facts = item.facts ?? createSemanticFacts();
  const status = item.status ?? 'valid';
  const specificity = item.specificity ?? zeroSpecificity();
  let summary;
  if (item.role === 'list')
    summary = summarizeList(builder, item.node, item.mode, facts);
  else if (item.role === 'pseudo')
    summary = summarizePseudo(builder, item.node, status, specificity, facts);
  else if (item.role === 'complex')
    summary = summarizeComplex(builder, item.node, status, specificity, facts);
  else
    summary = summarizeCompound(builder, item.node, status, specificity, facts);
  if (
    item.role === 'complex' &&
    item.mode !== 'outer-unforgiving' &&
    hasSemanticFact(summary.facts, semanticFacts.pseudoElement)
  )
    summary.status = 'invalid';
  builder.closeSummary(item.node, summary);
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index @param {number} end */
