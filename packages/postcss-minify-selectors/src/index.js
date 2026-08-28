import getBrowsersList from '#getBrowsersList';
import caniuseApi from 'caniuse-api';
import parser from 'postcss-selector-parser';
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

/**
 * @param {parser.Attribute} selector
 * @return {void}
 */
function attribute(selector) {
  if (selector.value) {
    if (selector.raws.value) {
      // Join selectors that are split over new lines
      selector.raws.value = selector.raws.value.replace(/\\\n/g, '').trim();
    }
    if (canUnquote(selector.value)) {
      selector.quoteMark = null;
    }

    if (selector.operator) {
      selector.operator = /** @type {parser.AttributeOperator} */ (
        selector.operator.trim()
      );
    }
  }

  selector.rawSpaceBefore = '';
  selector.rawSpaceAfter = '';
  selector.spaces.attribute = { before: '', after: '' };
  selector.spaces.operator = { before: '', after: '' };
  selector.spaces.value = {
    before: '',
    after: selector.insensitive ? ' ' : '',
  };

  if (selector.raws.spaces) {
    selector.raws.spaces.attribute = {
      before: '',
      after: '',
    };

    selector.raws.spaces.operator = {
      before: '',
      after: '',
    };

    selector.raws.spaces.value = {
      before: '',
      after: selector.insensitive ? ' ' : '',
    };

    if (selector.insensitive) {
      selector.raws.spaces.insensitive = {
        before: '',
        after: '',
      };
    }
  }

  selector.attribute = selector.attribute.trim();
}

/**
 * @param {parser.Combinator} selector
 * @return {void}
 */
function combinator(selector) {
  const value = selector.value.trim();
  selector.spaces.before = '';
  selector.spaces.after = '';
  selector.rawSpaceBefore = '';
  selector.rawSpaceAfter = '';
  selector.value = value.length ? value : ' ';
}

const pseudoReplacements = new Map([
  [':nth-child', ':first-child'],
  [':nth-of-type', ':first-of-type'],
  [':nth-last-child', ':last-child'],
  [':nth-last-of-type', ':last-of-type'],
]);

/**
 * @param {parser.Pseudo} selectorList
 * @return {void}
 */
function dedupeSelectorList(selectorList) {
  const uniques = new Set();
  const siblings = selectorList.nodes.slice();
  for (const sibling of siblings) {
    const siblingStr = String(sibling);

    if (!uniques.has(siblingStr)) {
      uniques.add(siblingStr);
    } else {
      sibling.remove();
    }
  }
}

/**
 * @param {parser.Pseudo} selector
 * @return {void}
 */
function pseudo(selector) {
  const value = selector.value.toLowerCase();

  if (selector.nodes.length === 1 && pseudoReplacements.has(value)) {
    const first = selector.at(0);
    const one = first.at(0);

    if (first.length === 1) {
      if (one.value === '1') {
        selector.replaceWith(
          parser.pseudo({
            value: /** @type {string} */ (pseudoReplacements.get(value)),
          })
        );
      }

      if (one.value && one.value.toLowerCase() === 'even') {
        one.value = '2n';
      }
    }

    if (first.length === 3) {
      const two = first.at(1);
      const three = first.at(2);

      if (
        one.value &&
        one.value.toLowerCase() === '2n' &&
        two.value === '+' &&
        three.value === '1'
      ) {
        one.value = 'odd';

        two.remove();
        three.remove();
      }
    }

    return;
  }

  dedupeSelectorList(selector);

  if (pseudoElements.has(value)) {
    selector.value = selector.value.slice(1);
  }
}

const tagReplacements = new Map([
  ['from', '0%'],
  ['100%', 'to'],
]);

/**
 * @param {parser.Tag} selector
 * @return {void}
 */
function tag(selector) {
  const value = selector.value.toLowerCase();

  const isSimple = selector.parent && selector.parent.nodes.length === 1;
  // Avoid simplifying complex selectors (`entry 100% {...}`)
  if (!isSimple) {
    return;
  }

  // Simplify simple selectors that have replacements (`100% {...}`)
  if (tagReplacements.has(value)) {
    selector.value = /** @type {string} */ (tagReplacements.get(value));
  }
}

/**
 * @param {parser.Universal & parser.Namespace} selector
 * @return {void}
 */
function universal(selector) {
  const next = selector.next();

  // A namespaced universal selector (`ns|*`, `|*`) restricts which elements
  // match; dropping it would widen the selector to any namespace
  if (!selector.namespace && next && next.type !== 'combinator') {
    selector.remove();
  }
}

const reducers = new Map(
  /** @type {[string, ((selector: parser.Node) => void)][]}*/ ([
    ['attribute', attribute],
    ['combinator', combinator],
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

            selectors.walk((sel) => {
              // Trim whitespace around the value
              sel.spaces.before = sel.spaces.after = '';
              if (sel.type === 'pseudo') {
                pseudo(sel);
                return;
              }

              const reducer = reducers.get(sel.type);
              if (reducer !== undefined) {
                reducer(sel);
                return;
              }

              if (
                sel.type === 'selector' &&
                sel.parent &&
                sel.parent.type !== 'pseudo'
              ) {
                const toString = String(sel);
                if (!uniqueSelectors.has(toString)) {
                  uniqueSelectors.add(toString);
                } else {
                  sel.remove();
                }
              }
            });
            if (resolved.sort) {
              selectors.nodes.sort();
            }
            if (isFoldEnabled) {
              const folded = foldToIs(selectors);
              if (folded !== null) {
                selectors.nodes = parser().astSync(folded).nodes;
              }
            }
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

            if (cache.has(selector)) {
              rule.selector = cache.get(selector);

              return;
            }

            const optimizedSelector = processor.processSync(selector);

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
