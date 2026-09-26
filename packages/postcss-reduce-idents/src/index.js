import encode from './lib/encode.js';
import counterReducer from './lib/counter.js';
import counterStyleReducer from './lib/counter-style.js';
import keyframesReducer from './lib/keyframes.js';
import gridTemplateReducer from './lib/grid-template.js';

/** @typedef {{
    counter?: boolean, counterStyle?: boolean,
    keyframes?: boolean, gridTemplate?: boolean,
    encoder?: (value: string, index: number) => string}} Options
*/
/** @typedef {{
 *    collect: (node: import('postcss').AnyNode) => void,
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
  encoder = (value, index) => encode(index),
} = {}) {
  /** @type {Reducer[]} */
  const reducers = [];

  if (counter) {
    reducers.push(counterReducer(encoder));
  }
  if (counterStyle) {
    reducers.push(counterStyleReducer(encoder));
  }
  if (keyframes) {
    reducers.push(keyframesReducer(encoder));
  }
  if (gridTemplate) {
    reducers.push(gridTemplateReducer(encoder));
  }

  return {
    postcssPlugin: 'postcss-reduce-idents',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      css.walk((node) => {
        for (const reducer of reducers) {
          reducer.collect(node);
        }
      });

      for (const reducer of reducers) {
        reducer.transform();
      }
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
