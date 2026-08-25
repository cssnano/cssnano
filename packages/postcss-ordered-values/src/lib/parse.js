import {
  isFunctionNode,
  isSimpleBlockNode,
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';
import {
  isTokenComma,
  isTokenDimension,
  isTokenIdent,
  isTokenNumber,
  isTokenPercentage,
  tokenize,
} from '@csstools/css-tokenizer';

/** @param {unknown[]} nodes */
function stringify(nodes) {
  if (!Array.isArray(nodes)) return nodes.toString();
  return nodes
    .map((node) =>
      node.toString === Object.prototype.toString ? node.value : node.toString()
    )
    .join('');
}

/** @param {string} value */
function unit(value) {
  const tokens = tokenize({ css: value }).filter(
    (token) => token[0] !== 'EOF-token'
  );
  if (
    tokens.length !== 1 ||
    (!isTokenNumber(tokens[0]) &&
      !isTokenDimension(tokens[0]) &&
      !isTokenPercentage(tokens[0]))
  )
    return false;
  let tokenUnit = '';
  if (isTokenDimension(tokens[0])) tokenUnit = tokens[0][4].unit;
  else if (isTokenPercentage(tokens[0])) tokenUnit = '%';
  return { number: tokens[0][1], unit: tokenUnit };
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function legacyNode(node) {
  if (isFunctionNode(node) || isSimpleBlockNode(node)) {
    const value = isFunctionNode(node) ? node.getName() : '';
    return {
      type: 'function',
      value,
      nodes: node.value.map(legacyNode),
      toString() {
        return `${this.value}(${stringify(this.nodes)})`;
      },
    };
  }
  if (isTokenNode(node) && isTokenComma(node.value))
    return {
      type: 'div',
      value: ',',
      toString() {
        return this.value;
      },
    };
  if (node.type === 'whitespace')
    return {
      type: 'space',
      value: node.toString(),
      toString() {
        return this.value;
      },
    };
  if (node.type === 'comment')
    return {
      type: 'comment',
      value: node.toString(),
      toString() {
        return this.value;
      },
    };
  const value = node.toString();
  const word =
    isTokenNode(node) &&
    (isTokenIdent(node.value) ||
      node.value[0] === 'hash-token' ||
      isTokenNumber(node.value) ||
      isTokenDimension(node.value) ||
      isTokenPercentage(node.value) ||
      node.value[0] === 'url-token');
  return {
    type: word ? 'word' : 'string',
    value,
    toString() {
      return this.value;
    },
  };
}

/** @param {unknown[]} nodes @param {(node: any) => boolean | void} callback */
function walk(nodes, callback) {
  for (const node of nodes) {
    if (callback(node) !== false && node.nodes) walk(node.nodes, callback);
  }
}

/** @param {string} value */
function parse(value) {
  const nodes = parseListOfComponentValues(tokenize({ css: value })).map(
    legacyNode
  );
  return {
    nodes,
    walk(callback) {
      walk(this.nodes, callback);
      return this;
    },
    toString() {
      return stringify(this.nodes);
    },
  };
}

export { parse, stringify, unit };
