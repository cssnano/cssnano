/**
 * @typedef {'list' | 'complex' | 'compound' | 'combinator' | 'qualified-name' | 'class' | 'id' | 'attribute' | 'pseudo' | 'nesting' | 'raw'} NodeKind
 * @typedef {'valid' | 'invalid' | 'opaque'} ParseStatus
 * @typedef {'outer-unforgiving' | 'forgiving' | 'unforgiving' | 'relative' | 'compound-only'} ListMode
 * @typedef {readonly [number, number, number]} Specificity
 * @typedef {{id:number,tuple:[number,number,number]}} SpecificityEntry
 * @typedef {{status:'valid',specificity:Specificity}|{status:'opaque'}} SpecificityResult
 * @typedef {number} SemanticFacts
 * @typedef {{kind:NodeKind,startToken:number,endToken:number,subtreeEnd:number,status:ParseStatus,specificity?:Specificity,specificityId?:number,facts?:SemanticFacts,payload:number}} ArenaNode
 * @typedef {{mode:ListMode,keyframe?:boolean,hasDefaultNamespace?:boolean}} ListPayload
 * @typedef {{value:string}} CombinatorPayload
 * @typedef {{namespace:{kind:'absent'}|{kind:'empty'}|{kind:'wildcard'}|{kind:'named',token:number},subject:{kind:'universal',token:number}|{kind:'type',token:number}}} QualifiedNamePayload
 * @typedef {{name:string,nameToken:number,colonCount:1|2,pseudoKind:'class'|'element'|'unknown',argumentGrammar?:string,specificityPolicy:string,argumentNode?:number}} PseudoPayload
 * @typedef {{namespace:{kind:'absent'}|{kind:'empty'}|{kind:'wildcard'}|{kind:'named',token:number},nameToken:number,matcher?:string,valueToken?:number,modifierToken?:number,caseBehavior:'default'|'ascii-insensitive'|'case-sensitive'}} AttributePayload
 * @typedef {{lists:readonly Readonly<ListPayload>[],combinators:readonly Readonly<CombinatorPayload>[],qualifiedNames:readonly Readonly<QualifiedNamePayload>[],pseudos:readonly Readonly<PseudoPayload>[],attributes:readonly Readonly<AttributePayload>[]}} PayloadTables
 * @typedef {import('./tokenUtils.js').CSSToken} CSSToken
 */

import { EMPTY_FACTS, ZERO_SPECIFICITY } from './arenaSemantics.js';

export {
  semanticFacts,
  createSemanticFacts,
  hasSemanticFact,
  addSemanticFact,
  mergeSemanticFacts,
  isFoldEligible,
  zeroSpecificity,
  addSpecificity,
} from './arenaSemantics.js';

const summaryKinds = new Set(['list', 'complex', 'compound', 'pseudo']);

class SelectorArenaBuilder {
  /** @param {string} source @param {readonly CSSToken[]} tokens @param {number} base */
  constructor(source, tokens, base) {
    this.source = source;
    this.tokens = tokens;
    this.base = base;
    /** @type {ArenaNode[]} */ this.nodes = [];
    /** @type {number[]} */ this.frames = [];
    /** @type {Map<number, Map<number, Map<number, SpecificityEntry>>>} */
    this.specificityTree = new Map();
    /** @type {number} */ this.specificityCount = 0;
    this.internSpecificity(ZERO_SPECIFICITY);
    /** @type {{lists:ListPayload[],combinators:CombinatorPayload[],qualifiedNames:QualifiedNamePayload[],pseudos:PseudoPayload[],attributes:AttributePayload[]}} */
    this.payloads = {
      lists: [],
      combinators: [],
      qualifiedNames: [],
      pseudos: [],
      attributes: [],
    };
  }

  /** @param {NodeKind} kind @param {number} startToken @param {number} endToken @param {{status?:ParseStatus,payload?:number,specificity?:Specificity,facts?:SemanticFacts}} [options] */
  open(kind, startToken, endToken, options = {}) {
    const index = this.nodes.length;
    const hasSummary = summaryKinds.has(kind);
    this.nodes.push({
      kind,
      startToken,
      endToken,
      subtreeEnd: index + 1,
      status: options.status ?? 'valid',
      specificity: hasSummary
        ? (options.specificity ?? ZERO_SPECIFICITY)
        : undefined,
      specificityId: undefined,
      facts: hasSummary ? (options.facts ?? EMPTY_FACTS) : undefined,
      payload: options.payload ?? -1,
    });
    this.frames.push(index);
    return index;
  }

  /** @param {number} nodeIndex */
  close(nodeIndex) {
    const node = this.nodes[nodeIndex];
    if (node && summaryKinds.has(node.kind))
      throw new Error('summary arena nodes must close with closeSummary');
    this.#closeFrame(nodeIndex);
  }

  /**
   * @param {number} nodeIndex
   * @param {{status?:ParseStatus,specificity?:Specificity,facts?:SemanticFacts}} [summary]
   */
  closeSummary(nodeIndex, summary = {}) {
    const node = this.nodes[nodeIndex];
    if (!node || !summaryKinds.has(node.kind))
      throw new Error('closeSummary requires an open summary arena node');
    const specificity = summary.specificity ?? node.specificity;
    const hasSafeSpecificity =
      specificity !== undefined &&
      specificity.every(
        (component) => Number.isSafeInteger(component) && component >= 0
      );
    const requestedStatus = summary.status ?? node.status;
    node.status =
      requestedStatus === 'valid' && !hasSafeSpecificity
        ? 'opaque'
        : requestedStatus;
    if (node.status === 'valid' && hasSafeSpecificity) {
      const interned = this.internSpecificity(specificity);
      node.specificity = interned.tuple;
      node.specificityId = interned.id;
    } else {
      node.specificity = undefined;
      node.specificityId = undefined;
    }
    node.facts = summary.facts ?? node.facts ?? EMPTY_FACTS;
    this.#closeFrame(nodeIndex);
  }

  /**
   * Interns a specificity by its three components, one nested map each, so
   * equal tuples share an id and ids are dense in first-seen order.
   *
   * @param {Specificity} specificity
   */
  internSpecificity(specificity) {
    const [a, b, c] = specificity;
    let byB = this.specificityTree.get(a);
    if (!byB) {
      byB = new Map();
      this.specificityTree.set(a, byB);
    }
    let byC = byB.get(b);
    if (!byC) {
      byC = new Map();
      byB.set(b, byC);
    }
    let found = byC.get(c);
    if (!found) {
      const tuple = /** @type {[number, number, number]} */ ([a, b, c]);
      found = { id: this.specificityCount++, tuple };
      byC.set(c, found);
    }
    return found;
  }

  /** @param {number} nodeIndex */
  #closeFrame(nodeIndex) {
    if (this.frames.pop() !== nodeIndex)
      throw new Error('arena nodes must close in stack order');
    this.nodes[nodeIndex].subtreeEnd = this.nodes.length;
  }

  /** @param {NodeKind} kind @param {number} startToken @param {number} endToken @param {{status?:ParseStatus,payload?:number,specificity?:Specificity,facts?:SemanticFacts}} [options] */
  leaf(kind, startToken, endToken, options) {
    const index = this.open(kind, startToken, endToken, options);
    if (summaryKinds.has(kind)) this.closeSummary(index, options);
    else this.close(index);
    return index;
  }

  /** @param {keyof SelectorArenaBuilder['payloads']} table @param {object} payload */
  payload(table, payload) {
    const values = this.payloads[table];
    const index = values.length;
    values.push(/** @type {never} */ (payload));
    return index;
  }

  finish() {
    if (this.frames.length !== 0)
      throw new Error('cannot finish an open arena');
    if (!this.nodes[0]) throw new Error('arena must contain a root');
    return new SelectorArena(
      this.source,
      this.tokens,
      this.nodes,
      this.payloads,
      this.base
    );
  }
}

export class SelectorArena {
  /**
   * @param {string} source the text the arena spells
   * @param {readonly CSSToken[]} tokens
   * @param {readonly Readonly<ArenaNode>[]} nodes
   * @param {PayloadTables} payloads
   * @param {number} base where `source` starts in the text the token positions refer to
   */
  constructor(source, tokens, nodes, payloads, base) {
    this.source = source;
    this.tokens = tokens;
    this.nodes = nodes;
    this.payloads = payloads;
    this.base = base;
  }

  /** @param {number} nodeIndex @param {(childIndex:number)=>void} callback */
  forEachChild(nodeIndex, callback) {
    const node = this.nodes[nodeIndex];
    if (!node) throw new RangeError('unknown arena node');
    let child = nodeIndex + 1;
    while (child < node.subtreeEnd) {
      callback(child);
      child = this.nodes[child].subtreeEnd;
    }
  }
}

/** @param {string} source @param {readonly CSSToken[]} tokens @param {(builder:SelectorArenaBuilder)=>void} build @param {number} [base] @return {SelectorArena} */
export function buildSelectorArena(source, tokens, build, base = 0) {
  const builder = new SelectorArenaBuilder(source, tokens, base);
  build(builder);
  return builder.finish();
}
