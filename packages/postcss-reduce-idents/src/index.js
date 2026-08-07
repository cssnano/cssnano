'use strict';
const encode = require('./lib/encode');
const counterReducer = require('./lib/counter');
const counterStyleReducer = require('./lib/counter-style');
const keyframesReducer = require('./lib/keyframes');
const gridTemplateReducer = require('./lib/grid-template');

/** @typedef {{
    counter?: boolean, counterStyle?: boolean,
    keyframes?: boolean, gridTemplate?: boolean,
    encoder?: (value: string, index: number) => string}} Options
*/
/** @typedef {{
 *    collect: (node: import('postcss').AnyNode, encoder: (value: string, num: number) => string) => void,
 *    transform: () => void
 *  }} Reducer
 */
/**
 * @param {Options} arg
 * @return {import('postcss').Plugin}
 */
function pluginCreator({
  counter = true,
  counterStyle = true,
  keyframes = true,
  gridTemplate = true,
  encoder = encode,
} = {}) {
  /** @type {Reducer[]} */
  const reducers = [];

  if (counter) {
    reducers.push(counterReducer());
  }
  if (counterStyle) {
    reducers.push(counterStyleReducer());
  }
  if (keyframes) {
    reducers.push(keyframesReducer());
  }
  if (gridTemplate) {
    reducers.push(gridTemplateReducer());
  }

  return {
    postcssPlugin: 'postcss-reduce-idents',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      css.walk((node) => {
        for (const reducer of reducers) {
          reducer.collect(node, encoder);
        }
      });

      for (const reducer of reducers) {
        reducer.transform();
      }
    },
  };
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<Options>}*/ (
  pluginCreator
);
