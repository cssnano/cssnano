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
  return nodes.map((node) => stringifyNode(node)).join('');
}

// The compatibility adapter intentionally mirrors several legacy node kinds.
// oxlint-disable-next-line complexity
function legacyNode(node) {
  if (isFunctionNode(node) || isSimpleBlockNode(node)) {
    const functionNode = isFunctionNode(node);
    const value = functionNode ? node.getName() : '';
    const start = functionNode ? `${value}(` : node.startToken[1];
    const end = functionNode ? ')' : node.endToken?.[1] || '';
    return {
      type: 'function',
      value,
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
  if (node.type === 'comment')
    return {
      type: 'comment',
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
      after: '',
      toString() {
        return this.value + this.after;
      },
    };
  if (isTokenNode(node) && node.value[0] === 'url-token')
    return {
      type: 'function',
      value: 'url',
      nodes: [],
      toString() {
        return node.toString();
      },
    };
  if (isTokenNode(node) && node.value[0] === 'string-token') {
    const source = node.toString();
    return {
      type: 'string',
      quote: source[0],
      value: source.slice(1, -1),
      toString() {
        return `${this.quote}${this.value}${this.quote}`;
      },
    };
  }
  const word =
    isTokenNode(node) &&
    (isTokenIdent(node.value) ||
      node.value[0] === 'hash-token' ||
      isTokenNumber(node.value) ||
      isTokenDimension(node.value) ||
      isTokenPercentage(node.value) ||
      node.value[0] === 'delim-token');
  const value = node.toString();
  return {
    type: word ? 'word' : 'string',
    value,
    toString() {
      return this.value;
    },
  };
}

function parse(value) {
  const nodes = parseListOfComponentValues(tokenize({ css: value })).map(
    legacyNode
  );
  for (let index = 0; index < nodes.length - 1; index++) {
    if (
      nodes[index].type === 'div' &&
      nodes[index].value === '/' &&
      nodes[index + 1].type === 'space'
    ) {
      nodes[index].after = nodes[index + 1].value;
      nodes.splice(index + 1, 1);
    }
  }
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

function stringifyNode(node) {
  if (node.toString !== Object.prototype.toString) return node.toString();
  if (node.type === 'string' && node.quote) {
    return `${node.quote}${node.value}${node.quote}`;
  }
  return node.value;
}

export { parse, stringify, unit };
