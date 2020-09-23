/* eslint-disable no-warning-comments */
function encode(str) {
  let result = '';

  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }

  return result;
}

export default () => {
  return {
    postcssPlugin: 'toModules',
    Rule(rule) {
      // FIXME: This visitor is not being visited neither any of the other visitors event the Root
      rule.selectors = rule.selectors.map((selector) => {
        const slice = selector.slice(1);

        return `.${encode(slice).slice(0, 7)}__${slice}`;
      });
    },
  };
};

export const postcss = true;
