import { stageDescriptor } from '../../pipeline/host.js';
import reduceCalc from 'postcss-calc/reduce';
import { parsedValueText } from '../../utils/parsedValueText.js';

/** @import {PostCssCalcOptions} from 'postcss-calc' */
/** @import {Helpers, Root} from 'postcss' */
/** @import {StageDescriptor, ValueStage} from '../../pipeline/host.js' */

/**
 * Reduces the calc() functions of one text. A parse error goes to the
 * `onParseError` option when it is set, and otherwise to `warn`. A selector
 * cannot keep a calc() that does not resolve to a plain value, so it always
 * unwraps.
 *
 * @param {string} text
 * @param {PostCssCalcOptions} options
 * @param {(message: string, plugin?: string) => void} warn
 * @param {boolean} selector
 * @returns {string}
 */
function reduceWith(text, options, warn, selector) {
  return reduceCalc(text, {
    precision: options.precision,
    warnWhenCannotResolve: options.warnWhenCannotResolve,
    onParseError:
      options.onParseError ?? ((error) => warn(error.message, 'postcss-calc')),
    onWarn: (message) => warn(message, 'postcss-calc'),
    unwrapSingleValue: selector || options.unwrapSingleValue,
  });
}

/**
 * The at-rule and selector parts of the calc stage. They run once the walk of
 * the declarations has finished, since they change no declaration.
 *
 * @param {Root} root
 * @param {PostCssCalcOptions} options
 * @param {Helpers['result']} result
 */
function reducePreludes(root, options, result) {
  if (!options.mediaQueries && !options.selectors) return;
  root.walk((node) => {
    if (node.type === 'atrule' && options.mediaQueries) {
      const params = reduceWith(
        node.params,
        options,
        (message, plugin) => result.warn(message, { plugin, node }),
        false
      );
      if (params !== node.params) node.params = params;
    }
    if (node.type === 'rule' && options.selectors) {
      const selector = reduceWith(
        node.selector,
        options,
        (message, plugin) => result.warn(message, { plugin, node }),
        true
      );
      if (selector !== node.selector) node.selector = selector;
    }
  });
}

/**
 * The stage for one run. Its value reducer joins the walk of the other value
 * stages, and its at-rule and selector part follows that walk.
 *
 * @param {PostCssCalcOptions} options
 * @returns {ValueStage}
 */
function calcStage(options) {
  return {
    forProperty: () => (buffer) => {
      const text = buffer.text();
      // PostCSS gives the value without comments, so reduce what it would give.
      const source = text.includes('/*')
        ? parsedValueText(buffer.tokens())
        : text;
      const out = reduceWith(
        source,
        options,
        (message, plugin) => buffer.warn(message, plugin),
        false
      );
      if (out !== source) buffer.replaceText(out);
    },
    run: (root, helpers) => reducePreludes(root, options, helpers.result),
  };
}

/** @type {StageDescriptor} */
const calc = stageDescriptor({
  compile: (options) => () => calcStage(options),
});

export { calc as default };
