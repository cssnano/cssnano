import getBrowsersList from '#getBrowsersList';
import {
  isFunctionNode,
  isSimpleBlockNode,
  isTokenNode,
  parseListOfComponentValues,
} from '@csstools/css-parser-algorithms';
import {
  isTokenComma,
  isTokenDelim,
  isTokenIdent,
  isTokenNumber,
  tokenize,
} from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';

const { getArguments } = cssnanoUtils;
/** @import browserslist from 'browserslist' */

/**
 * Return the greatest common divisor
 * of two numbers.
 *
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

/**
 * @param {number} a
 * @param {number} b
 * @return {[number, number]}
 */
function aspectRatio(a, b) {
  const divisor = gcd(a, b);

  return [a / divisor, b / divisor];
}

/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue} node
 * @return {string}
 */
function serialize(node) {
  if (!isFunctionNode(node) && !isSimpleBlockNode(node)) {
    return node.toString();
  }
  return serializeContainer(node);
}

/**
 * @param {import('@csstools/css-parser-algorithms').FunctionNode | import('@csstools/css-parser-algorithms').SimpleBlock} node
 * @return {string}
 */
function serializeContainer(node) {
  let children = node.value.map(serialize);
  const name = isFunctionNode(node) ? node.getName().toLowerCase() : '';
  if (isAspectRatio(name, node.value)) {
    children = normalizeAspectRatio(node.value, children);
  }
  const customProperty = isCustomProperty(name, node.value);
  const customEmpty = isSimpleBlockNode(node) && isCustomEmpty(node.value);
  const trailingCommaSpace =
    isFunctionNode(node) &&
    node.value.at(-1)?.type === 'whitespace' &&
    node.value.some((child) => isTokenNode(child) && isTokenComma(child.value));
  if (!customProperty) {
    if (children[0]?.trim() === '') children = children.slice(1);
    if (!customEmpty && !trailingCommaSpace && children.at(-1)?.trim() === '')
      children.pop();
  }
  const inner = children.join('');
  const opening = isFunctionNode(node) ? node.name[1] : node.startToken[1];
  const closing = node.endToken?.[1] || '';
  return `${opening}${inner}${closing}`;
}

/**
 * @param {string} name
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes
 * @return {boolean}
 */
function isAspectRatio(name, nodes) {
  return (
    name.includes('-aspect-ratio') ||
    nodes.some(
      (child) =>
        isTokenNode(child) &&
        isTokenIdent(child.value) &&
        child.value[1].toLowerCase().includes('-aspect-ratio')
    )
  );
}

/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes
 * @param {string[]} children
 * @return {string[]}
 */
function normalizeAspectRatio(nodes, children) {
  const slash = nodes.findIndex(
    (child) =>
      isTokenNode(child) && isTokenDelim(child.value) && child.value[1] === '/'
  );
  const leftIndex = nodes
    .slice(0, slash)
    .findLastIndex((child) => isTokenNode(child));
  const rightIndex =
    slash + 1 + nodes.slice(slash + 1).findIndex((child) => isTokenNode(child));
  const left = nodes[leftIndex];
  const right = nodes[rightIndex];
  if (
    slash <= 0 ||
    leftIndex < 0 ||
    rightIndex >= nodes.length ||
    !isTokenNode(left) ||
    !isTokenNumber(left.value) ||
    !isTokenNode(right) ||
    !isTokenNumber(right.value)
  ) {
    return children;
  }
  const [a, b] = aspectRatio(Number(left.value[1]), Number(right.value[1]));
  const normalized = [...children];
  normalized[leftIndex] = a.toString();
  normalized[rightIndex] = b.toString();
  return normalized;
}

/**
 * @param {string} name
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes
 * @return {boolean}
 */
function isCustomProperty(name, nodes) {
  const first = nodes[0];
  return Boolean(
    name &&
    isTokenNode(first) &&
    isTokenIdent(first.value) &&
    first.value[1].startsWith('--') &&
    nodes.length === 1
  );
}

/**
 * @param {import('@csstools/css-parser-algorithms').ComponentValue[]} nodes
 * @return {boolean}
 */
function isCustomEmpty(nodes) {
  return (
    nodes.at(-1)?.toString().trim() === '' &&
    nodes.slice(0, -1).at(-1)?.toString() === ':' &&
    nodes.some(
      (child) =>
        isTokenNode(child) &&
        isTokenIdent(child.value) &&
        child.value[1].startsWith('--')
    )
  );
}

/**
 * @param {unknown[]} items
 * @return {string}
 */
function sortAndDedupe(items) {
  const a = [...new Set(items)];
  a.sort();
  return a.join();
}

/**
 * @param {boolean} legacy
 * @param {import('postcss').AtRule} rule
 * @return {void}
 */
function transform(legacy, rule) {
  const ruleName = rule.name.toLowerCase();

  // We should re-arrange parameters only for `@media` and `@supports` at-rules
  if (!rule.params || !['media', 'supports'].includes(ruleName)) {
    return;
  }

  const params = parseListOfComponentValues(tokenize({ css: rule.params }));
  const replacements = new Map();
  const normalized = params.map((node, index) => {
    if (isTokenNode(node) && isTokenComma(node.value)) return node;
    if (isTokenNode(node) && isTokenIdent(node.value)) {
      const next = params[index + 1];
      const before = params[index - 2];
      if (
        node.value[1].toLowerCase() === 'all' &&
        ruleName === 'media' &&
        !before
      ) {
        if (!legacy || next) replacements.set(node, '');
        const and = params[index + 2];
        if (
          isTokenNode(and) &&
          isTokenIdent(and.value) &&
          and.value[1].toLowerCase() === 'and'
        ) {
          replacements.set(and, '');
          if (params[index + 1]) replacements.set(params[index + 1], '');
          if (params[index + 3]) replacements.set(params[index + 3], '');
        }
      }
    }
    return node;
  });

  const args = getArguments(normalized).map((arg) =>
    arg
      .map((node) =>
        replacements.has(node) ? replacements.get(node) : serialize(node)
      )
      .join('')
  );
  rule.params = sortAndDedupe(
    args
      .map((arg) => arg.replace(/\s+/g, ' '))
      .map((arg) => {
        const compact = arg
          .replace(/\s*,\s*(?!\))/g, ',')
          .replace(/\s*:\s*/g, ':')
          .replace(/\s*\/\s*/g, '/');
        const withEmptyCustomPropertySpace = compact.replace(
          /(--[\w-]+:)(?=\))/g,
          '$1 '
        );
        return /--[\w-]+:\s*\)/.test(withEmptyCustomPropertySpace)
          ? withEmptyCustomPropertySpace.trim()
          : compact.trim();
      })
  );

  if (!rule.params.length) {
    rule.raws.afterName = '';
  }
}

const allBugBrowers = new Set(['ie 10', 'ie 11']);

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {AutoprefixerOptions & BrowserslistOptions} Options
 */

/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
function pluginCreator(options = {}) {
  return {
    postcssPlugin: 'postcss-minify-params',

    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(options, stats, from, file, env);

      const hasAllBug = !new Set(browsers).isDisjointFrom(allBugBrowers);

      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkAtRules((rule) => transform(hasAllBug, rule));
        },
      };
    },
  };
}
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
