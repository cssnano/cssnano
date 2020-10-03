function encode(str) {
  let result = '';

  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }

  return result;
}

const pluginCreator = () => {
  return {
    postcssPlugin: 'toModules',
    Once(css) {
      css.walkRules((rule) => {
        rule.selectors = rule.selectors.map((selector) => {
          const slice = selector.slice(1);

          return `.${encode(slice).slice(0, 7)}__${slice}`;
        });
      });
    },
  };
};

pluginCreator.postcss = true;

export default pluginCreator;
