import encode from './lib/encode';
import counterReducer from './lib/counter';
import counterStyleReducer from './lib/counter-style';
import keyframesReducer from './lib/keyframes';
import gridTemplateReducer from './lib/grid-template';

function pluginCreator({
  counter = true,
  counterStyle = true,
  keyframes = true,
  gridTemplate = true,
  encoder = encode,
} = {}) {
  const reducers = [];

  counter && reducers.push(counterReducer());
  counterStyle && reducers.push(counterStyleReducer());
  keyframes && reducers.push(keyframesReducer());
  gridTemplate && reducers.push(gridTemplateReducer());

  return {
    postcssPlugin: 'postcss-reduce-idents',

    OnceExit(css) {
      css.walk((node) => {
        reducers.forEach((reducer) => reducer.collect(node, encoder));
      });

      reducers.forEach((reducer) => reducer.transform());
    },
  };
}

pluginCreator.postcss = true;
export default pluginCreator;
