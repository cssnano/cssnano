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
  return { unit: tokenUnit };
}

export { parse, unit };
