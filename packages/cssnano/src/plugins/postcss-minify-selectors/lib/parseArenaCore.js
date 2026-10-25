import cssnanoUtils from '#utils';
import {
  addSemanticFact,
  buildSelectorArena,
  createSemanticFacts,
  semanticFacts,
} from './arena.js';
import {
  complexParts,
  closeWork,
  hasContent,
  mergeStatus,
} from './parseArenaStructure.js';
import { addLeafWork, compoundChildren } from './parseArenaCompound.js';

const { TokenType, balancedStructure, tokens: tokenize } = cssnanoUtils;
/** @typedef {import('./arena.js').ListMode} ListMode */
/** @typedef {import('./arena.js').ParseStatus} ParseStatus */
/** @typedef {import('./arena.js').SemanticFacts} SemanticFacts */
/** @typedef {import('./arena.js').Specificity} Specificity */
/** @typedef {NonNullable<ReturnType<typeof balancedStructure>>} Structure */
/** @typedef {{mode?:ListMode,keyframe?:boolean,hasDefaultNamespace?:boolean,verifyArena?:boolean}} ParseContext */
/** @typedef {{kind:'list',start:number,end:number,mode:ListMode,argumentPayload?:number,insideHas:boolean}} ListWork */
/** @typedef {{kind:'complex',start:number,end:number,mode:ListMode,status?:ParseStatus,insideHas:boolean}} ComplexWork */
/** @typedef {{kind:'compound',start:number,end:number,mode:ListMode,insideHas:boolean}} CompoundWork */
/** @typedef {{kind:'combinator',start:number,end:number,value:string}} CombinatorWork */
/** @typedef {{kind:'attribute',start:number}} AttributeWork */
/** @typedef {{kind:'class'|'id'|'nesting',start:number,end:number}} NamedSimpleWork */
/** @typedef {{kind:'qualified-name',start:number,end:number,payload:import('./arena.js').QualifiedNamePayload}} QualifiedNameWork */
/** @typedef {{kind:'raw',start:number,end:number,status:ParseStatus}} RawWork */
/** @typedef {{kind:'pseudo',start:number,end:number,mode:ListMode,insideHas:boolean}} PseudoWork */
/** @typedef {{kind:'close',node:number,role:'list'|'complex'|'compound'|'pseudo',mode?:ListMode,status?:ParseStatus,facts?:SemanticFacts,specificity?:Specificity}} CloseWork */
/** @typedef {ListWork|ComplexWork|CompoundWork|CombinatorWork|AttributeWork|NamedSimpleWork|QualifiedNameWork|RawWork|PseudoWork|CloseWork} ParseWork */

/**
 * The tokens from `start` to `end` of a list that spells `source`, with the
 * text they spell. A whole list is used as it is. A range is rebased to start
 * at 0, so the arena reads it as the text it spells.
 *
 * @param {string} source
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} list
 * @param {number} start
 * @param {number} end
 * @returns {{text: string, tokens: readonly import('@csstools/css-tokenizer').CSSToken[]}}
 */
function tokenRange(source, list, start, end) {
  if (start === 0 && end === list.length) return { text: source, tokens: list };
  if (start >= end) return { text: '', tokens: [] };
  const base = list[start][2];
  /** @type {import('@csstools/css-tokenizer').CSSToken[]} */
  const rebased = [];
  for (let index = start; index < end; index++) {
    const token = list[index];
    rebased.push(
      /** @type {import('@csstools/css-tokenizer').CSSToken} */ ([
        token[0],
        token[1],
        token[2] - base,
        token[3] - base,
        token[4],
      ])
    );
  }
  return { text: source.slice(base, list[end - 1][3] + 1), tokens: rebased };
}

/**
 * @param {string} source
 * @param {ParseContext} [context]
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [sourceTokens] the tokens that spell `source`, read instead of tokenizing it
 * @param {number} [start] where the selector starts in `sourceTokens`
 * @param {number} [end] where the selector ends in `sourceTokens`
 */
export function parseSelectorArena(
  source,
  context = {},
  sourceTokens,
  start = 0,
  end = sourceTokens?.length ?? 0
) {
  const mode = context.mode ?? 'outer-unforgiving';
  const keyframe = context.keyframe ?? false;
  const hasDefaultNamespace = context.hasDefaultNamespace ?? false;
  const verifyArena = context.verifyArena ?? true;
  const range =
    sourceTokens === undefined
      ? undefined
      : tokenRange(source, sourceTokens, start, end);
  const text = range?.text ?? source;
  const list = range?.tokens ?? tokenize(source);
  const structure = balancedStructure(list);
  if (!structure) {
    return buildSelectorArena(
      text,
      list,
      (builder) => {
        builder.leaf('raw', 0, list.length, {
          status: 'opaque',
        });
      },
      verifyArena
    );
  }
  const input = structure.tokens;
  return buildSelectorArena(
    text,
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
          let facts = createSemanticFacts();
          if (parsed.commentDescendant)
            facts = addSemanticFact(facts, semanticFacts.commentDescendant);
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
          let facts = createSemanticFacts();
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
            facts = addSemanticFact(facts, semanticFacts.namespace);
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
    verifyArena
  );
}
