/**
 * @typedef {import('./arena.js').SelectorArena} SelectorArena
 * @typedef {import('./arena.js').NodeKind} NodeKind
 */

/** @type {ReadonlyMap<NodeKind, keyof import('./arena.js').SelectorArena['payloads']>} */
const payloadTableForKind = new Map([
  ['list', 'lists'],
  ['combinator', 'combinators'],
  ['qualified-name', 'qualifiedNames'],
  ['pseudo', 'pseudos'],
  ['attribute', 'attributes'],
]);

/**
 * Checks a finished arena: token spans, preorder shape, payload indexes and
 * token references. Reads the arena and throws at the first violation.
 * @param {SelectorArena} arena
 */
export function verifySelectorArena(arena) {
  verifySpans(arena);
  verifyPreorder(arena);
  verifyRootShape(arena);
  verifyPayloadIndexes(arena);
  verifyPayloadReferences(arena);
  verifyRootKind(arena);
}

/** @param {SelectorArena} arena */
function verifySpans({ nodes, tokens }) {
  for (const node of nodes) {
    const { startToken, endToken } = node;
    if (
      !Number.isInteger(startToken) ||
      !Number.isInteger(endToken) ||
      startToken < 0 ||
      endToken < startToken ||
      endToken > tokens.length
    )
      throw new RangeError('invalid exclusive token span');
  }
}

/**
 * Each child must sit inside its parent's span and after its previous
 * sibling. Each subtree must end where its children do.
 * @param {SelectorArena} arena
 */
function verifyPreorder({ nodes }) {
  for (let parent = 0; parent < nodes.length; parent++) {
    const parentNode = nodes[parent];
    const end = parentNode.subtreeEnd;
    if (!(end > parent && end <= nodes.length))
      throw new RangeError('invalid preorder subtree bounds');
    let previous = -1;
    let child = parent + 1;
    while (child < end) {
      const childNode = nodes[child];
      if (childNode.subtreeEnd <= child || childNode.subtreeEnd > end)
        throw new RangeError('invalid preorder subtree bounds');
      if (
        childNode.startToken < parentNode.startToken ||
        childNode.endToken > parentNode.endToken
      )
        throw new RangeError(
          'child token span must be contained by its parent'
        );
      if (previous !== -1 && childNode.startToken < nodes[previous].endToken)
        throw new RangeError(
          'sibling token spans must be ordered and non-overlapping'
        );
      previous = child;
      child = childNode.subtreeEnd;
    }
    if (child !== end)
      throw new RangeError('children do not fill the preorder subtree');
  }
}

/** @param {SelectorArena} arena */
function verifyRootShape({ nodes, tokens }) {
  const root = nodes[0];
  if (!root || root.subtreeEnd !== nodes.length)
    throw new Error('arena must contain a single preorder root');
  if (root.startToken !== 0 || root.endToken !== tokens.length)
    throw new RangeError('arena root token span must cover all tokens');
}

/** @param {SelectorArena} arena */
function verifyPayloadIndexes({ nodes, payloads }) {
  for (const node of nodes) {
    const tableName = payloadTableForKind.get(node.kind);
    if (!tableName) {
      if (node.payload !== -1)
        throw new RangeError(
          `${node.kind} nodes must not have a payload index`
        );
      continue;
    }
    const table = payloads[tableName];
    if (
      !Number.isInteger(node.payload) ||
      node.payload < 0 ||
      node.payload >= table.length
    )
      throw new RangeError(`invalid ${node.kind} payload index`);
  }
}

/** @param {SelectorArena} arena */
function verifyPayloadReferences({ nodes, tokens, payloads }) {
  /** @param {number} index */
  const validTokenIndex = (index) =>
    Number.isInteger(index) && index >= 0 && index < tokens.length;
  for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
    const node = nodes[nodeIndex];
    if (node.kind === 'qualified-name') {
      const payload = payloads.qualifiedNames[node.payload];
      if (
        (payload.namespace.kind === 'named' &&
          !validTokenIndex(payload.namespace.token)) ||
        !validTokenIndex(payload.subject.token)
      )
        throw new RangeError('invalid qualified-name token reference');
    } else if (node.kind === 'attribute') {
      const payload = payloads.attributes[node.payload];
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
          (reference) => reference !== undefined && !validTokenIndex(reference)
        )
      )
        throw new RangeError('invalid attribute token reference');
    } else if (node.kind === 'pseudo') {
      verifyPseudoReferences(
        nodes,
        nodeIndex,
        payloads.pseudos[node.payload],
        validTokenIndex
      );
    }
  }
}

/**
 * @param {readonly import('./arena.js').ArenaNode[]} nodes
 * @param {number} nodeIndex
 * @param {import('./arena.js').PseudoPayload} payload
 * @param {(index:number)=>boolean} validTokenIndex
 */
function verifyPseudoReferences(nodes, nodeIndex, payload, validTokenIndex) {
  if (!validTokenIndex(payload.nameToken))
    throw new RangeError('invalid pseudo token reference');
  if (payload.argumentNode === undefined) return;
  const argument = nodes[payload.argumentNode];
  if (
    !Number.isInteger(payload.argumentNode) ||
    payload.argumentNode <= nodeIndex ||
    payload.argumentNode >= nodes[nodeIndex].subtreeEnd ||
    argument?.kind !== 'list'
  )
    throw new RangeError('invalid pseudo argument node reference');
}

/** @param {SelectorArena} arena */
function verifyRootKind({ nodes }) {
  const root = nodes[0];
  if (
    root.kind !== 'list' &&
    !(root.kind === 'raw' && root.status === 'opaque' && root.subtreeEnd === 1)
  )
    throw new Error(
      'arena root must be a selector list or a full-span opaque raw fallback'
    );
}
