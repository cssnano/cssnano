import getBrowsersList from '#getBrowsersList';
import caniuseApi from 'caniuse-api';
import parser, {
  rewrite,
  withChildren,
  withValue,
} from 'postcss-selector-parser';
import canUnquote from './lib/canUnquote.js';
import foldToIs from './lib/foldToIs.js';

const { isSupported } = caniuseApi;
/** @import browserslist from 'browserslist' */

const pseudoElements = new Set([
  '::before',
  '::after',
  '::first-letter',
  '::first-line',
]);

/** @param {string} value @return {string} */
function compactSelectorSeparators(value) {
  let quote = '';
  let comment = false;
  let result = '';
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    const next = value[index + 1];
    if (comment) {
      result += char;
      if (char === '*' && next === '/') {
        result += next;
        index++;
        comment = false;
      }
      continue;
    }
    if (quote) {
      result += char;
      if (char === '\\') result += value[++index] || '';
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '*') {
      result += char + next;
      index++;
      comment = true;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      result += char;
      continue;
    }
    if (char === ')' || char === ']') {
      result = result.replace(/\s+$/, '');
    }
    result += char;
    if (char === ',' || char === '(') {
      while (/\s/.test(value[index + 1] || '')) index++;
    }
  }
  return result;
}

/**
 * @param {parser.Attribute} selector
 * @return {parser.Node | null | undefined}
 */
function attribute(selector) {
  const spaces = {
    ...selector.format.spaces,
    attribute: { before: '', after: '' },
    operator: { before: '', after: '' },
    value: { before: '', after: selector.caseSensitivity ? ' ' : '' },
    caseSensitivity: { before: '', after: '' },
  };
  const raws = { ...selector.format.raws, spaces };
  delete raws.insensitive;
  if (selector.value) {
    const value = selector.value;
    if (selector.format.raws.value) {
      // Join selectors that are split over new lines
      raws.value = selector.format.raws.value.replace(/\\\n/g, '').trim();
    }
    let quoteMark = selector.quoteMark;
    if (canUnquote(value)) {
      quoteMark = null;
      delete raws.value;
    }
    return parser.attribute({
      attribute: selector.attribute.trim(),
      operator: selector.operator?.trim(),
      value,
      quoteMark,
      caseSensitivity: selector.caseSensitivity,
      spaces,
      raws,
    });
  }
  return parser.attribute({
    attribute: selector.attribute.trim(),
    namespace: selector.namespace,
    operator: selector.operator,
    quoteMark: selector.value === undefined ? undefined : null,
    value: selector.value,
    caseSensitivity: selector.caseSensitivity,
    spaces,
    raws,
  });
}

/**
 * @param {parser.Combinator} selector
 * @return {parser.Node}
 */
function combinator(selector) {
  const value = selector.value.trim();
  return parser.combinator({
    value: value.length ? value : ' ',
    spaces: { ...selector.format.spaces, before: '', after: '' },
    raws: selector.format.raws,
  });
}

const pseudoReplacements = new Map([
  [':nth-child', ':first-child'],
  [':nth-of-type', ':first-of-type'],
  [':nth-last-child', ':last-child'],
  [':nth-last-of-type', ':last-of-type'],
]);

/**
 * @param {parser.Pseudo} selector
 * @return {parser.Node | undefined}
 */
function pseudo(selector) {
  const value = selector.value.toLowerCase();

  if (selector.children.length === 1 && pseudoReplacements.has(value)) {
    const first = selector.children[0];
    const one = first.type === 'string' ? first : first.children?.[0];

    if (one) {
      if (one?.value === '1') {
        return parser.pseudo({ value: pseudoReplacements.get(value) });
      }

      if (one?.value && one.value.toLowerCase() === 'even') {
        return withChildren(selector, [withValue(one, '2n')]);
      }
    }

    if (one?.type === 'string') {
      const formula = one.value.replace(/\s+/g, '');
      if (formula.toLowerCase() === '2n+1') {
        return withChildren(selector, [withValue(one, 'odd')]);
      }
      return withChildren(selector, [withValue(one, formula)]);
    }

    return selector;
  }

  const unique = new Set();
  const children = selector.children
    .filter((child) => {
      if (child.type !== 'selector') return true;
      const key = String(child);
      if (unique.has(key)) return false;
      unique.add(key);
      return true;
    })
    .map((child) =>
      child.type === 'selector' ? trimNodeSpaces(child) : child
    );
  if (
    children.length !== selector.children.length ||
    children.some((child, index) => child !== selector.children[index])
  ) {
    return withChildren(selector, children);
  }

  if (pseudoElements.has(value)) {
    return withValue(selector, selector.value.slice(1));
  }
  return undefined;
}

const tagReplacements = new Map([
  ['from', '0%'],
  ['100%', 'to'],
]);

/**
 * @param {parser.Tag} selector
 * @return {parser.Node}
 */
function tag(selector) {
  const value = selector.value.toLowerCase();

  const isSimple = selector.parent && selector.parent.children.length === 1;
  // Avoid simplifying complex selectors (`entry 100% {...}`)
  if (!isSimple) {
    return;
  }

  // Simplify simple selectors that have replacements (`100% {...}`)
  if (tagReplacements.has(value)) {
    return withValue(selector, tagReplacements.get(value));
  }
  return selector;
}

/**
 * @param {parser.Universal & parser.Namespace} selector
 * @return {void}
 */
function universal(selector) {
  const siblings = selector.parent?.children || [];
  const next = siblings[siblings.indexOf(selector) + 1];

  // A namespaced universal selector (`ns|*`, `|*`) restricts which elements
  // match; dropping it would widen the selector to any namespace
  if (!selector.namespace && next && next.type !== 'combinator') {
    return null;
  }
  return selector;
}

/** @param {parser.Node} node @return {parser.Node} */
function trimNodeSpaces(node) {
  const rawSpaces =
    node.type === 'attribute' ? node.format.raws.spaces : undefined;
  const sourceSpaces = node.format.raws.spaces;
  const preservedSpaces =
    sourceSpaces &&
    Object.fromEntries(
      Object.entries(sourceSpaces).filter(
        ([, value]) => typeof value === 'string' && value.includes('/*')
      )
    );
  const rawFormat = { ...node.format.raws };
  delete rawFormat.spaces;
  const spaces = rawSpaces || preservedSpaces;
  const options = {
    source: node.source,
    sourceIndex: node.sourceIndex,
    value: node.value,
    attribute: node.attribute,
    operator: node.operator,
    namespace: node.namespace,
    quoteMark: node.quoteMark,
    caseSensitivity: node.caseSensitivity,
    spaces: { ...node.format.spaces, before: '', after: '' },
    raws: {
      ...rawFormat,
      ...(spaces && { spaces }),
    },
  };
  const factory = {
    class: parser.className,
    id: parser.id,
    root: parser.root,
    selector: parser.selector,
    pseudo: parser.pseudo,
    string: parser.string,
    tag: parser.tag,
    universal: parser.universal,
    combinator: parser.combinator,
    comment: parser.comment,
    nesting: parser.nesting,
    attribute: parser.attribute,
  }[node.type];
  const result = factory(options);
  return node.children ? withChildren(result, node.children) : result;
}

const reducers = new Map(
  /** @type {[string, ((selector: parser.Node) => void)][]}*/ ([
    ['attribute', attribute],
    ['combinator', combinator],
    ['pseudo', pseudo],
    ['tag', tag],
    ['universal', universal],
  ])
);

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 */

/**
 * @typedef {object} OwnOptions
 * @property {boolean} [sort=true]
 * @property {boolean} [convertToIs=true] Factor shared prefixes/suffixes in a
 *   comma-separated selector list into `:is(...)` when it produces shorter
 *   output and is safe with respect to cascade specificity. Automatically
 *   skipped when the configured browserslist target doesn't support `:is()`.
 */

/** @typedef {OwnOptions & AutoprefixerOptions & BrowserslistOptions} Options */

/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts) {
  const resolved = { sort: true, convertToIs: true, ...opts };
  return {
    postcssPlugin: 'postcss-minify-selectors',

    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result) {
      let isFoldEnabled = resolved.convertToIs !== false;
      if (isFoldEnabled) {
        const { stats, env, from, file } = result.opts || {};
        const browsers = getBrowsersList(resolved, stats, from, file, env);

        isFoldEnabled = isSupported('css-matches-pseudo', browsers);
      }

      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          const cache = new Map();
          const processor = parser((selectors) => {
            const uniqueSelectors = new Set();
            let rewritten = rewrite(selectors, (sel) => {
              const reducer = reducers.get(sel.type);
              if (reducer !== undefined) {
                const reduced = reducer(sel);
                return reduced === null || reduced === undefined
                  ? reduced
                  : trimNodeSpaces(reduced);
              }
              if (
                sel.type === 'selector' &&
                sel.parent &&
                sel.parent.type !== 'pseudo'
              ) {
                const toString = String(sel);
                if (uniqueSelectors.has(toString)) return null;
                uniqueSelectors.add(toString);
              }
              return trimNodeSpaces(sel);
            });
            if (resolved.sort) {
              rewritten = withChildren(
                rewritten,
                [...rewritten.children].toSorted((a, b) => {
                  const left = String(a).trim();
                  const right = String(b).trim();
                  if (left < right) return -1;
                  if (left > right) return 1;
                  return 0;
                })
              );
            }
            rewritten = withChildren(
              rewritten,
              rewritten.children.map((child) =>
                child.type === 'selector' ? trimNodeSpaces(child) : child
              )
            );
            if (isFoldEnabled) {
              const folded = foldToIs(rewritten);
              if (folded !== null) {
                rewritten = withChildren(
                  rewritten,
                  parser().astSync(folded).children
                );
              }
            }
            return rewritten;
          });

          css.walkRules((rule) => {
            const selector =
              rule.raws.selector && rule.raws.selector.value === rule.selector
                ? rule.raws.selector.raw
                : rule.selector;

            // If the selector ends with a ':' it is likely a part of a custom
            // mixin, so just pass through.
            if (selector[selector.length - 1] === ':') {
              return;
            }

            if (
              rule.parent?.type === 'atrule' &&
              /keyframes$/i.test(rule.parent.name)
            ) {
              rule.selector = selector
                .split(',')
                .map((part) =>
                  part
                    .trim()
                    .replace(/^from$/i, '0%')
                    .replace(/^100%$/i, 'to')
                )
                .join(',');
              return;
            }

            if (cache.has(selector)) {
              rule.selector = cache.get(selector);

              return;
            }

            let optimizedSelector;
            try {
              optimizedSelector = processor.processSync(selector);
              optimizedSelector = compactSelectorSeparators(
                optimizedSelector.replace(/^\s+/, '')
              );
            } catch {
              // v8 deliberately rejects malformed selector tokens. Preserve
              // processable PostCSS input that cannot be represented by it.
              optimizedSelector = compactSelectorSeparators(selector);
            }

            rule.selector = optimizedSelector;
            cache.set(selector, optimizedSelector);
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
