import cssnanoUtils from 'cssnano-utils';
import {
  isIdentifierContinuationToken,
  mergeStatus,
} from './parseArenaStructure.js';
import {
  addAttribute,
  openPseudo,
  pseudoDetails,
  pseudoEndAt,
  qualifiedNameAt,
} from './parseArenaPseudo.js';

const { TokenType } = cssnanoUtils;
/** @typedef {import('./arena.js').ListMode} ListMode */
/** @typedef {import('./arena.js').ParseStatus} ParseStatus */
/** @typedef {NonNullable<ReturnType<typeof cssnanoUtils.balancedTokens>>} Structure */
/** @typedef {import('./arena.js').QualifiedNamePayload} QualifiedNamePayload */
/** @typedef {Parameters<Parameters<typeof import('./arena.js').buildSelectorArena>[2]>[0]} Builder */
/** @typedef {{kind:'raw',start:number,end:number,status:ParseStatus}} RawWork */
/** @typedef {{kind:'attribute',start:number}|{kind:'pseudo',start:number,end:number,mode:ListMode,insideHas:boolean}|{kind:'class'|'id'|'nesting',start:number,end:number}|{kind:'qualified-name',start:number,end:number,payload:QualifiedNamePayload}|RawWork} ParseWork */

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index */
function opaqueNumericClass(input, index) {
  const token = input[index];
  const nextType = input[index + 1]?.[0];
  if (
    token[0] === TokenType.Delim &&
    token[1] === '.' &&
    (nextType === TokenType.Number || nextType === TokenType.Dimension)
  )
    return index + 2;
  if (token[0] === TokenType.Dimension && token[1].startsWith('.'))
    return index + 1;
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
  const opaqueClassEnd = opaqueNumericClass(input, index);
  if (opaqueClassEnd !== undefined)
    return {
      work: /** @type {ParseWork} */ ({
        kind: 'raw',
        start: index,
        end: opaqueClassEnd,
        status: 'opaque',
      }),
      end: opaqueClassEnd,
      status: /** @type {ParseStatus} */ ('opaque'),
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

/** @param {string} kind */
const isSubclassAfterPseudo = (kind) =>
  kind === 'class' ||
  kind === 'id' ||
  kind === 'attribute' ||
  kind === 'qualified-name';

/**
 * @param {readonly import('./tokenUtils.js').CSSToken[]} input
 * @param {number} index
 * @param {number} end
 * @return {RawWork}
 */
function readRawContinuation(input, index, end) {
  let rawEnd = index + 1;
  while (rawEnd < end && isIdentifierContinuationToken(input[rawEnd])) rawEnd++;
  return {
    kind: 'raw',
    start: index,
    end: rawEnd,
    status: 'opaque',
  };
}

/**
 * @param {{ work: ParseWork, end: number, status?: ParseStatus, hasQualifiedName?: boolean }} child
 * @param {Structure} structure
 * @param {number} end
 */
function extendQualifiedNameType(child, structure, end) {
  if (
    child.work.kind === 'qualified-name' &&
    child.work.payload.namespace.kind === 'absent' &&
    child.work.payload.subject.kind === 'type'
  ) {
    while (
      child.end < end &&
      isIdentifierContinuationToken(structure.tokens[child.end])
    )
      child.end++;
    child.work.end = child.end;
  }
}

/** @param {Structure} structure @param {number} start @param {number} end @param {ListMode} mode @param {boolean} insideHas */
export function compoundChildren(
  structure,
  start,
  end,
  mode,
  insideHas,
  keyframe = false
) {
  const input = structure.tokens;
  /** @type {ParseWork[]} */ const children = [];
  let status = /** @type {ParseStatus} */ ('valid');
  let index = start;
  let hasQualifiedName = false;
  let sawPseudoElement = false;
  while (index < end) {
    if (
      (hasQualifiedName || index !== start) &&
      input[index]?.[0] === TokenType.Ident &&
      isIdentifierContinuationToken(input[index + 1])
    ) {
      const rawWork = readRawContinuation(input, index, end);
      children.push(rawWork);
      status = mergeStatus(status, 'opaque');
      index = rawWork.end;
      continue;
    }
    const child = compoundChildAt(
      structure,
      index,
      end,
      hasQualifiedName || index !== start,
      keyframe
    );
    if (sawPseudoElement && isSubclassAfterPseudo(child.work.kind)) {
      status = 'invalid';
      child.status = 'invalid';
    }
    if (child.work.kind === 'pseudo') {
      const details = pseudoDetails(structure, child.work.start);
      if (details.isElement) sawPseudoElement = true;
      child.work.mode = mode;
      child.work.insideHas = insideHas;
    }
    extendQualifiedNameType(child, structure, end);
    children.push(child.work);
    status = mergeStatus(status, child.status ?? 'valid');
    hasQualifiedName ||= child.hasQualifiedName ?? false;
    index = child.end;
  }
  return { status, children };
}

/** @param {Builder} builder @param {ParseWork} item @param {Structure} structure @param {unknown[]} work */
export function addLeafWork(builder, item, structure, work) {
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
    });
}

/** @param {string} source @param {ParseContext} [context] */
