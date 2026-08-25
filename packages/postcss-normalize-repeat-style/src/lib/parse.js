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

function stringify(nodes) {
  return nodes.map((node) => node.toString()).join('');
}

function legacyNode(node) {
  if (isFunctionNode(node) || isSimpleBlockNode(node)) {
    const functionNode = isFunctionNode(node);
    const name = functionNode ? node.getName() : '';
    const start = functionNode ? `${name}(` : node.startToken[1];
    const end = functionNode ? ')' : node.endToken?.[1] || '';
    return {
      type: 'function',
      value: name,
      nodes: node.value.map(legacyNode),
      toString() {
        return `${start}${stringify(this.nodes)}${end}`;
      },
    };
  }
  if (node.type === 'whitespace')
    return {
      type: 'space',
      value: node.toString(),
      toString() {
        return this.value;
      },
    };
  if (isTokenNode(node) && isTokenComma(node.value))
    return {
      type: 'div',
      value: ',',
      toString() {
        return this.value;
      },
    };
  if (
    isTokenNode(node) &&
    node.value[0] === 'delim-token' &&
    node.value[1] === '/'
  )
    return {
      type: 'div',
      value: '/',
      toString() {
        return this.value;
      },
    };
  const word =
    isTokenNode(node) &&
    (isTokenIdent(node.value) ||
      isTokenNumber(node.value) ||
      isTokenDimension(node.value) ||
      isTokenPercentage(node.value));
  return {
    type: word ? 'word' : 'string',
    value: node.toString(),
    toString() {
      return this.value;
    },
  };
}

function parse(value) {
  const nodes = parseListOfComponentValues(tokenize({ css: value })).map(
    legacyNode
  );
  return {
    nodes,
    toString() {
      return stringify(this.nodes);
    },
  };
}

export { parse };
