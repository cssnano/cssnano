import {
  isFunctionNode,
  isSimpleBlockNode,
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';
import {
  isTokenComma,
  isTokenDelim,
  isTokenDimension,
  isTokenNumber,
  isTokenString,
  tokenize,
} from '@csstools/css-tokenizer';

/** @param {string} value */
function parse(value) {
  return parseListOfComponentValues(tokenize({ css: value }));
}

/**
 * Serializes immutable component values, replacing only components selected by
 * the caller. Function and simple-block delimiters remain their original
 * source, which is important for malformed-but-processable declarations.
 *
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} values
 * @param {Map<import('@csstools/css-parser-algorithms').ComponentValue, string>} replacements
 */
function serialize(values, replacements = new Map()) {
  return values
    .map((node) => {
      const replacement = replacements.get(node);
      if (replacement !== undefined) return replacement;
      if (isFunctionNode(node) || isSimpleBlockNode(node)) {
        const source = node.toString();
        const children = node.value.map((child) => child.toString()).join('');
        return source.replace(children, serialize(node.value, replacements));
      }
      return node.toString();
    })
    .join('');
}

/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} values
 * @param {(node: import('@csstools/css-parser-algorithms').ComponentValue, parent: import('@csstools/css-parser-algorithms').ComponentValue[] | undefined) => boolean | void} callback
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[] | undefined} parent
 */
function walk(values, callback, parent) {
  for (const node of values) {
    if (
      callback(node, parent) !== false &&
      (isFunctionNode(node) || isSimpleBlockNode(node))
    ) {
      walk(node.value, callback, node.value);
    }
  }
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function isIdentifier(node) {
  return isTokenNode(node) && node.value[0] === 'ident-token';
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function isString(node) {
  return isTokenNode(node) && isTokenString(node.value);
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function isNumeric(node) {
  return (
    isTokenNode(node) &&
    (isTokenNumber(node.value) || isTokenDimension(node.value))
  );
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function isComma(node) {
  return isTokenNode(node) && isTokenComma(node.value);
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function isSlash(node) {
  return isTokenNode(node) && isTokenDelim(node.value) && node.value[1] === '/';
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function name(node) {
  return isFunctionNode(node) ? node.getName().toLowerCase() : '';
}

/** @param {import('@csstools/css-parser-algorithms').ComponentValue} node */
function decoded(node) {
  if (!isTokenNode(node)) return '';
  return isTokenString(node.value) ? node.value[4].value : node.value[1];
}

/** @param {import('@csstools/css-parser-algorithms').FunctionNode} node */
function argumentsOf(node) {
  const args = [[]];
  for (const child of node.value) {
    if (isComma(child)) args.push([]);
    else args.at(-1).push(child);
  }
  return args;
}

export {
  argumentsOf,
  decoded,
  isIdentifier,
  isNumeric,
  isSlash,
  isString,
  name,
  parse,
  serialize,
  walk,
};
