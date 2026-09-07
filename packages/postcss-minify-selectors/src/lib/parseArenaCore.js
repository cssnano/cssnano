import cssnanoUtils from 'cssnano-utils';
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

const { TokenType, tokens } = cssnanoUtils;
/** @type {typeof cssnanoUtils.balancedTokens} */
const balancedTokens = cssnanoUtils.balancedTokens;
/** @typedef {import('./arena.js').ListMode} ListMode */
/** @typedef {import('./arena.js').ParseStatus} ParseStatus */
/** @typedef {import('./arena.js').SemanticFacts} SemanticFacts */
/** @typedef {NonNullable<ReturnType<typeof balancedTokens>>} Structure */
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
/** @typedef {{kind:'close',node:number,role:'list'|'complex'|'compound'|'pseudo',mode?:ListMode,status?:ParseStatus,facts?:SemanticFacts}} CloseWork */
/** @typedef {ListWork|ComplexWork|CompoundWork|CombinatorWork|AttributeWork|NamedSimpleWork|QualifiedNameWork|RawWork|PseudoWork|CloseWork} ParseWork */

/** @param {string} source @param {ParseContext} [context] */
export function parseSelectorArena(source, context = {}) {
  const mode = context.mode ?? 'outer-unforgiving';
  const keyframe = context.keyframe ?? false;
  const hasDefaultNamespace = context.hasDefaultNamespace ?? false;
  const verifyArena = context.verifyArena ?? true;
  const structure = balancedTokens(source);
  if (!structure) {
    const input = tokens(source);
    return buildSelectorArena(
      source,
      input,
      (builder) => {
        builder.leaf('raw', 0, input.length, {
          status: 'opaque',
        });
      },
      verifyArena
    );
  }
  const input = structure.tokens;
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
