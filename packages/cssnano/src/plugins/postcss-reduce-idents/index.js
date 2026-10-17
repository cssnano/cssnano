import encode from './lib/encode.js';
import counterReducer from './lib/counter.js';
import counterStyleReducer from './lib/counter-style.js';
import keyframesReducer from './lib/keyframes.js';
import gridTemplateReducer from './lib/grid-template.js';

/**
 * @typedef {object} Options
 * @property {boolean} [counter] Reduces `content`, `counter-reset` and `counter-increment` declarations. (default: true)
 * @property {boolean} [counterStyle] Reduces `counter-style` rules and `list-style` and `system` declarations. (default: true)
 * @property {boolean} [keyframes] Reduces `keyframes` rules and `animation` declarations. (default: true)
 * @property {boolean} [gridTemplate] Reduces `grid-template`, `grid-area`, `grid-column`, `grid-row` and `grid-template-areas` declarations. (default: true)
 * @property {(value: string, index: number) => string} [encoder] Replaces a name. Receives the name and how many names came before it.
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
