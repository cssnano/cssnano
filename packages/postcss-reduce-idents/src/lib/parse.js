import {
  isTokenDimension,
  isTokenComma,
  isTokenDelim,
  isTokenNumber,
  isTokenString,
  isTokenWhitespace,
  tokenize,
} from '@csstools/css-tokenizer';
import {
  isFunctionNode,
  isSimpleBlockNode,
  isTokenNode,
  isWhitespaceNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';

/**
 * A deliberately small compatibility tree for the reducer modules. It keeps
 * the old node contracts used by this package while CSSTools owns parsing.
 * @typedef {{type: string, value: string, nodes?: Node[], walk?: Function, toString: Function}} Node
 */

/** @param {string} value @return {{nodes: Node[], walk: Function, toString: Function}} */
export default function parse(value) {
  const nodes = parseNodes(
    parseListOfComponentValues(tokenize({ css: value }))
  );
  return makeContainer(nodes);
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} values @return {Node[]} */
function parseNodes(values) {
  return values.flatMap((node) => {
    if (isFunctionNode(node)) {
      return makeFunction(
        'function',
        node.getName(),
        parseNodes(node.value),
        node
      );
    }
    if (isSimpleBlockNode(node)) {
      // The legacy parser exposes bracketed grid-line lists as one word.
      // Keeping that shape is important: grid-template processing splits the
      // list itself so each line name can be resolved independently.
      const children = parseNodes(node.value);
      const first = children.find((child) => child.type !== 'space');
      const last = children
        .toReversed()
        .find((child) => child.type !== 'space');
      if (first) first.value = `[${first.value}`;
      if (last) last.value = `${last.value}]`;
      return children;
    }

    if (isWhitespaceNode(node)) {
      return makeLeaf('space', node.toString(), node);
    }

    const token = node.value;
    if (isTokenWhitespace(token)) {
      return makeLeaf('space', token[1], node);
    }
    if (isTokenString(token)) {
      return makeLeaf('string', token[4]?.value ?? token[1].slice(1, -1), node);
    }
    if (
      isTokenNode(node) &&
      (isTokenComma(token) || (isTokenDelim(token) && token[1] === '/'))
    ) {
      return makeLeaf('div', token[1], node);
    }
    return makeLeaf('word', token[1], node);
  });
}

/** @param {string} type @param {string} name @param {Node[]} nodes @param {object} source @return {Node} */
function makeFunction(type, name, nodes, source) {
  const node = /** @type {Node} */ ({ type, value: name, nodes, source });
  node.toString = () => {
    const raw = source.toString();
    const inner = source.value.map((child) => child.toString()).join('');
    return raw.replace(inner, nodes.map((child) => child.toString()).join(''));
  };
  return node;
}

/** @param {string} type @param {string} value @param {object} source @return {Node} */
function makeLeaf(type, value, source) {
  const node = /** @type {Node} */ ({ type, value, source });
  node.toString = () => {
    if (node.type === 'space' || node.type === 'div') return node.value;
    if (node.type === 'string') {
      const raw = source.toString();
      return raw[0] + node.value + raw[raw.length - 1];
    }
    return node.value;
  };
  return node;
}

/** @param {Node[]} nodes @return {{nodes: Node[], walk: Function, toString: Function}} */
function makeContainer(nodes) {
  return {
    nodes,
    walk(callback) {
      walkNodes(nodes, callback);
      return this;
    },
    toString() {
      return nodes.map((node) => node.toString()).join('');
    },
  };
}

/** @param {Node[]} nodes @param {(node: Node) => unknown} callback */
function walkNodes(nodes, callback) {
  for (const node of nodes) {
    const result = callback(node);
    if (result !== false && node.nodes) walkNodes(node.nodes, callback);
  }
}

/** @param {string} value @return {false | {value: number, unit: string}} */
export function unit(value) {
  const parsed = parseListOfComponentValues(tokenize({ css: value }));
  if (parsed.length !== 1 || !isTokenNode(parsed[0])) return false;
  const token = parsed[0].value;
  if (isTokenNumber(token)) return { value: token[4].value, unit: '' };
  if (isTokenDimension(token))
    return { value: token[4].value, unit: token[4].unit };
  return false;
}
