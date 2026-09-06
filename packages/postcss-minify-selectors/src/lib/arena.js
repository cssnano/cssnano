/**
 * @typedef {'list' | 'complex' | 'compound' | 'combinator' | 'qualified-name' | 'class' | 'id' | 'attribute' | 'pseudo' | 'nesting' | 'raw'} NodeKind
 * @typedef {'valid' | 'invalid' | 'opaque'} ParseStatus
 * @typedef {'outer-unforgiving' | 'forgiving' | 'unforgiving' | 'relative' | 'compound-only'} ListMode
 * @typedef {readonly [number, number, number]} Specificity
 * @typedef {{status:'valid',specificity:Specificity}|{status:'opaque'}} SpecificityResult
 * @typedef {number} SemanticFacts
 * @typedef {{kind:NodeKind,startToken:number,endToken:number,subtreeEnd:number,status:ParseStatus,specificity?:Specificity,specificityId?:number,facts?:SemanticFacts,payload:number}} ArenaNode
 * @typedef {{mode:ListMode,keyframe?:boolean,hasDefaultNamespace?:boolean}} ListPayload
 * @typedef {{value:string}} CombinatorPayload
 * @typedef {{namespace:{kind:'absent'}|{kind:'empty'}|{kind:'wildcard'}|{kind:'named',token:number},subject:{kind:'universal',token:number}|{kind:'type',token:number}}} QualifiedNamePayload
 * @typedef {{name:string,nameToken:number,colonCount:1|2,pseudoKind:'class'|'element'|'unknown',argumentGrammar?:string,specificityPolicy:string,argumentNode?:number}} PseudoPayload
 * @typedef {{namespace:{kind:'absent'}|{kind:'empty'}|{kind:'wildcard'}|{kind:'named',token:number},nameToken:number,matcher?:string,valueToken?:number,modifierToken?:number,caseBehavior:'default'|'ascii-insensitive'|'case-sensitive'}} AttributePayload
 * @typedef {{text:string}} RawPayload
 * @typedef {{lists:readonly Readonly<ListPayload>[],combinators:readonly Readonly<CombinatorPayload>[],qualifiedNames:readonly Readonly<QualifiedNamePayload>[],pseudos:readonly Readonly<PseudoPayload>[],attributes:readonly Readonly<AttributePayload>[],raw:readonly Readonly<RawPayload>[]}} PayloadTables
 * @typedef {import('./tokenUtils.js').CSSToken} CSSToken
 */

const summaryKinds = new Set(['list', 'complex', 'compound', 'pseudo']);
export const semanticFacts = Object.freeze({
  namespace: 1,
  pseudoElement: 2,
  vendorPseudo: 4,
  nesting: 8,
  attributeModifier: 16,
  commentDescendant: 32,
  nestedHas: 64,
  function: 128,
  unsafePseudo: 256,
});
/** @type {ReadonlyMap<NodeKind, keyof PayloadTables>} */
const payloadTableForKind = new Map([
  ['list', 'lists'],
  ['combinator', 'combinators'],
  ['qualified-name', 'qualifiedNames'],
  ['pseudo', 'pseudos'],
  ['attribute', 'attributes'],
  ['raw', 'raw'],
]);

/** @return {SemanticFacts} */
export function createSemanticFacts() {
  return 0;
}

/** @param {SemanticFacts | undefined} facts @param {number} fact */
export function hasSemanticFact(facts, fact) {
  return (facts ?? 0) % (fact * 2) >= fact;
}

/** @param {SemanticFacts} facts @param {number} fact */
export function addSemanticFact(facts, fact) {
  return hasSemanticFact(facts, fact) ? facts : facts + fact;
}

/** @param {SemanticFacts} left @param {SemanticFacts} right */
export function mergeSemanticFacts(left, right) {
  let merged = left;
  for (let fact = 1; fact <= semanticFacts.unsafePseudo; fact *= 2)
    if (hasSemanticFact(right, fact)) merged = addSemanticFact(merged, fact);
  return merged;
}

/** @type {Specificity} */
const ZERO_SPECIFICITY = Object.freeze([0, 0, 0]);
const EMPTY_FACTS = createSemanticFacts();

/** @param {ArenaNode} compound @return {boolean} */
export function isFoldEligible(compound) {
  const facts = compound.facts;
  return (
    compound.kind === 'compound' &&
    compound.status === 'valid' &&
    facts === EMPTY_FACTS
  );
}

/** @return {Specificity} */
export function zeroSpecificity() {
  return ZERO_SPECIFICITY;
}

/** @param {Specificity} a @param {Specificity} b @return {SpecificityResult} */
export function addSpecificity(a, b) {
  /** @type {Specificity} */
  const result = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  if (result.some((component) => !Number.isSafeInteger(component)))
    return { status: 'opaque' };
  return { status: 'valid', specificity: result };
}

class SelectorArenaBuilder {
  /** @param {string} source @param {readonly CSSToken[]} tokens */
  constructor(source, tokens) {
    this.source = source;
    this.tokens = tokens;
    /** @type {ArenaNode[]} */ this.nodes = [];
    /** @type {number[]} */ this.frames = [];
    /** @type {number[]} */ this.lastChildren = [];
    /** @type {number[]} */ this.roots = [];
    this.specificityByKey = new Map([
      ['0,0,0', { id: 0, tuple: ZERO_SPECIFICITY }],
    ]);
    /** @type {Specificity[]} */
    this.specificities = [ZERO_SPECIFICITY];
    /** @type {{lists:ListPayload[],combinators:CombinatorPayload[],qualifiedNames:QualifiedNamePayload[],pseudos:PseudoPayload[],attributes:AttributePayload[],raw:RawPayload[]}} */
    this.payloads = {
      lists: [],
      combinators: [],
      qualifiedNames: [],
      pseudos: [],
      attributes: [],
      raw: [],
    };
  }

  /** @param {NodeKind} kind @param {number} startToken @param {number} endToken @param {{status?:ParseStatus,payload?:number,specificity?:Specificity,facts?:SemanticFacts}} [options] */
  open(kind, startToken, endToken, options = {}) {
    this.#validateBounds(startToken, endToken);
    const parent = this.frames.at(-1);
    if (parent !== undefined) {
      const parentNode = this.nodes[parent];
      if (startToken < parentNode.startToken || endToken > parentNode.endToken)
        throw new RangeError(
          'child token span must be contained by its parent'
        );
      const previousChild = this.lastChildren[parent];
      if (
        previousChild !== undefined &&
        startToken < this.nodes[previousChild].endToken
      )
        throw new RangeError(
          'sibling token spans must be ordered and non-overlapping'
        );
    } else {
      this.roots.push(this.nodes.length);
    }
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
    if (parent !== undefined) this.lastChildren[parent] = index;
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

  /** @param {Specificity} specificity */
  internSpecificity(specificity) {
    const key = specificity.join(',');
    let found = this.specificityByKey.get(key);
    if (!found) {
      const tuple = Object.freeze(
        /** @type {[number, number, number]} */ ([...specificity])
      );
      found = { id: this.specificities.length, tuple };
      this.specificityByKey.set(key, found);
      this.specificities.push(tuple);
    }
    return found;
  }

  /** @param {number} nodeIndex */
  #closeFrame(nodeIndex) {
    if (this.frames.pop() !== nodeIndex)
      throw new Error('arena nodes must close in stack order');
    const node = this.nodes[nodeIndex];
    node.subtreeEnd = this.nodes.length;
    let child = nodeIndex + 1;
    while (child < node.subtreeEnd) {
      const childNode = this.nodes[child];
      if (
        childNode.subtreeEnd <= child ||
        childNode.subtreeEnd > node.subtreeEnd
      )
        throw new RangeError('invalid preorder subtree bounds');
      child = childNode.subtreeEnd;
    }
    if (child !== node.subtreeEnd)
      throw new RangeError('children do not fill the preorder subtree');
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
    if (
      this.roots.length !== 1 ||
      this.roots[0] !== 0 ||
      this.nodes[0]?.subtreeEnd !== this.nodes.length
    )
      throw new Error('arena must contain a single preorder root');
    const root = this.nodes[0];
    if (root.startToken !== 0 || root.endToken !== this.tokens.length)
      throw new RangeError('arena root token span must cover all tokens');
    this.#validatePayloadIndexes();
    this.#validatePayloadReferences();
    if (
      root.kind !== 'list' &&
      !(
        root.kind === 'raw' &&
        root.status === 'opaque' &&
        root.subtreeEnd === 1
      )
    )
      throw new Error(
        'arena root must be a selector list or a full-span opaque raw fallback'
      );
    for (const node of this.nodes) {
      Object.freeze(node);
    }
    for (const table of Object.values(this.payloads)) {
      for (const payload of table) {
        Object.freeze(payload);
      }
      Object.freeze(table);
    }
    for (const payload of this.payloads.qualifiedNames) {
      Object.freeze(payload.namespace);
      Object.freeze(payload.subject);
    }
    for (const payload of this.payloads.attributes)
      Object.freeze(payload.namespace);
    Object.freeze(this.nodes);
    Object.freeze(this.payloads);
    Object.freeze(this.specificities);
    return new SelectorArena(
      this.source,
      this.tokens,
      this.nodes,
      this.payloads,
      this.specificities
    );
  }

  #validatePayloadIndexes() {
    for (const node of this.nodes) {
      const tableName = payloadTableForKind.get(node.kind);
      if (!tableName) {
        if (node.payload !== -1)
          throw new RangeError(
            `${node.kind} nodes must not have a payload index`
          );
        continue;
      }
      const table = this.payloads[tableName];
      if (
        !Number.isInteger(node.payload) ||
        node.payload < 0 ||
        node.payload >= table.length
      )
        throw new RangeError(`invalid ${node.kind} payload index`);
    }
  }

  #validatePayloadReferences() {
    /** @param {number} index */
    const validTokenIndex = (index) =>
      Number.isInteger(index) && index >= 0 && index < this.tokens.length;
    for (let nodeIndex = 0; nodeIndex < this.nodes.length; nodeIndex++) {
      const node = this.nodes[nodeIndex];
      if (node.kind === 'qualified-name') {
        const payload = this.payloads.qualifiedNames[node.payload];
        if (
          (payload.namespace.kind === 'named' &&
            !validTokenIndex(payload.namespace.token)) ||
          !validTokenIndex(payload.subject.token)
        )
          throw new RangeError('invalid qualified-name token reference');
      } else if (node.kind === 'attribute') {
        const payload = this.payloads.attributes[node.payload];
        const references = [
          payload.nameToken,
          payload.valueToken,
          payload.modifierToken,
          payload.namespace.kind === 'named'
            ? payload.namespace.token
            : undefined,
        ];
        if (
          references.some(
            (reference) =>
              reference !== undefined && !validTokenIndex(reference)
          )
        )
          throw new RangeError('invalid attribute token reference');
      } else if (node.kind === 'pseudo') {
        const payload = this.payloads.pseudos[node.payload];
        if (!validTokenIndex(payload.nameToken))
          throw new RangeError('invalid pseudo token reference');
        if (payload.argumentNode !== undefined) {
          const argument = this.nodes[payload.argumentNode];
          if (
            !Number.isInteger(payload.argumentNode) ||
            payload.argumentNode <= nodeIndex ||
            payload.argumentNode >= node.subtreeEnd ||
            argument?.kind !== 'list'
          )
            throw new RangeError('invalid pseudo argument node reference');
        }
      }
    }
  }

  /** @param {number} startToken @param {number} endToken */
  #validateBounds(startToken, endToken) {
    if (
      !Number.isInteger(startToken) ||
      !Number.isInteger(endToken) ||
      startToken < 0 ||
      endToken < startToken ||
      endToken > this.tokens.length
    )
      throw new RangeError('invalid exclusive token span');
  }
}

export class SelectorArena {
  /** @param {string} source @param {readonly CSSToken[]} tokens @param {readonly Readonly<ArenaNode>[]} nodes @param {PayloadTables} payloads @param {readonly Specificity[]} specificities */
  constructor(source, tokens, nodes, payloads, specificities) {
    this.source = source;
    this.tokens = tokens;
    this.nodes = nodes;
    this.payloads = payloads;
    this.specificities = specificities;
    Object.freeze(this);
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

/** @param {string} source @param {readonly CSSToken[]} tokens @param {(builder:SelectorArenaBuilder)=>void} build @return {SelectorArena} */
export function buildSelectorArena(source, tokens, build) {
  const builder = new SelectorArenaBuilder(source, tokens);
  build(builder);
  return builder.finish();
}
