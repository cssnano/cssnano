import {
  isFunctionNode,
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';
import {
  isTokenDimension,
  isTokenNumber,
  tokenize,
} from '@csstools/css-tokenizer';

const transformRegex = /transform$/i;

function splitArguments(values) {
  const argumentsList = [];
  let current = [];
  for (const value of values) {
    if (value.toString() === ',') {
      argumentsList.push(current);
      current = [];
    } else {
      current.push(value);
    }
  }
  argumentsList.push(current);

  return argumentsList;
}

function getValue(argument) {
  let first = 0;
  let last = argument.length;
  while (argument[first]?.type === 'whitespace') first++;
  while (argument[last - 1]?.type === 'whitespace') last--;
  const trimmedArgument = argument.slice(first, last);

  if (trimmedArgument.length === 1 && isFunctionNode(trimmedArgument[0])) {
    const name = trimmedArgument[0].getName().toLowerCase();
    if (name === 'var' || name === 'env') {
      const children = trimmedArgument[0].value.filter(
        (child) => child.type !== 'whitespace'
      );
      if (children.length === 1) return children[0].toString();
    }
  }

  if (trimmedArgument.length !== 1 || !isTokenNode(trimmedArgument[0])) {
    return Number.NaN;
  }
  const token = trimmedArgument[0].value;
  if (!isTokenNumber(token) && !isTokenDimension(token)) return Number.NaN;
  return Number.parseFloat(token[1]);
}

function argumentSource(argument) {
  let first = 0;
  let last = argument.length;
  while (argument[first]?.type === 'whitespace') first++;
  while (argument[last - 1]?.type === 'whitespace') last--;
  return argument
    .slice(first, last)
    .map((node) => node.toString())
    .join('');
}

// The individual transform reductions share argument state; keeping them here
// preserves the old plugin's exact reduction order.
// eslint-disable-next-line complexity
function reduceFunction(node, values, argumentsList) {
  const name = node.getName().toLowerCase();
  const args = argumentsList.map(argumentSource);
  const separators = argumentsList.map((argument) => {
    const whitespace = argument.find((item) => item.type === 'whitespace');
    return whitespace?.toString() ?? '';
  });
  const replace = (newName, indexes) =>
    `${newName}(${indexes.map((i, position) => `${position ? separators[indexes[position - 1] + 1] : ''}${args[i]}`).join(',')})`;

  if (
    name === 'matrix3d' &&
    values.length === 16 &&
    values[15] &&
    values[2] === 0 &&
    values[3] === 0 &&
    values[6] === 0 &&
    values[7] === 0 &&
    values[8] === 0 &&
    values[9] === 0 &&
    values[10] === 1 &&
    values[11] === 0 &&
    values[14] === 0 &&
    values[15] === 1
  ) {
    return replace('matrix', [0, 1, 4, 5, 12, 13]);
  }

  if (name === 'rotate3d' && values.length === 4) {
    const match = new Map([
      ['1,0,0', 'rotateX'],
      ['0,1,0', 'rotateY'],
      ['0,0,1', 'rotate'],
    ]).get(values.slice(0, 3).toString());
    if (match) return replace(match, [3]);
  }

  if (name === 'rotatez' && values.length === 1) return replace('rotate', [0]);

  if (name === 'scale' && values.length === 2) {
    if (values[0] === values[1]) return replace('scale', [0]);
    if (values[1] === 1) return replace('scaleX', [0]);
    if (values[0] === 1) return replace('scaleY', [1]);
  }

  if (name === 'scale3d' && values.length === 3) {
    if (values[1] === 1 && values[2] === 1) return replace('scaleX', [0]);
    if (values[0] === 1 && values[2] === 1) return replace('scaleY', [1]);
    if (values[0] === 1 && values[1] === 1) return replace('scaleZ', [2]);
  }

  if (name === 'translate' && values.length === 2) {
    if (values[1] === 0) return replace('translate', [0]);
    if (values[0] === 0) return replace('translateY', [1]);
  }

  if (
    name === 'translate3d' &&
    values.length === 3 &&
    values[0] === 0 &&
    values[1] === 0
  ) {
    return replace('translateZ', [2]);
  }
}

function transform(value) {
  const nodes = parseListOfComponentValues(tokenize({ css: value }));

  function serialize(values) {
    return values
      .map((child) => {
        if (!isFunctionNode(child)) return child.toString();
        const children = serialize(child.value);
        const argumentsList = splitArguments(child.value);
        const replacement = reduceFunction(
          child,
          argumentsList.map(getValue),
          argumentsList
        );
        if (replacement) return replacement;
        const source = child.toString();
        const original = child.value.map((item) => item.toString()).join('');
        return source.replace(original, children);
      })
      .join('');
  }

  return serialize(nodes);
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-reduce-transforms',
    prepare() {
      const cache = new Map();
      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkDecls(transformRegex, (decl) => {
            if (cache.has(decl.value)) {
              decl.value = cache.get(decl.value);
              return;
            }
            const value = decl.value;
            const result = transform(value);
            decl.value = result;
            cache.set(value, result);
          });
        },
      };
    },
  };
}

/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
