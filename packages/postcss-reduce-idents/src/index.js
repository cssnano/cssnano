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
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
