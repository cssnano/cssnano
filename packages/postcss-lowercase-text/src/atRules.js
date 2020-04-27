const nameTransformOnly = (rule) => {
  rule.name = rule.name.toLowerCase();
};
const paramsTransform = (rule) => {
  rule.params = rule.params.toLowerCase();
};

const propsTransform = (rule) => {
  rule.walkDecls((node) => {
    node.prop = node.prop.toLowerCase();
  });
};
const nameAndPropsTransform = (rule) => {
  nameTransformOnly(rule);
  propsTransform(rule);
};

// eslint-disable-next-line no-unused-vars
const nameAndparamsTransform = (rule) => {
  nameTransformOnly(rule);
  paramsTransform(rule);
};

const nameParamsPropsTransform = (rule) => {
  nameTransformOnly(rule);
  paramsTransform(rule);
  propsTransform(rule);
};

export default {
  keyframes: nameAndPropsTransform,
  'counter-style': nameAndPropsTransform,
  namespace: nameTransformOnly,
  import: nameTransformOnly,
  'font-face': nameAndPropsTransform,
  'font-feature-values': nameTransformOnly,
  page: nameAndPropsTransform,
  supports: nameAndPropsTransform,
  media: nameParamsPropsTransform,
  charset: nameTransformOnly,
  document: nameTransformOnly,
  viewport: nameAndPropsTransform,
};
