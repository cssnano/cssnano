const valueIncludes = (str) => (node) => node.value && node.value.includes(str);

const both = (fn) => (a, b) => fn(a) && fn(b);

const hasConstant = both(valueIncludes('constant'));
const hasEnv = both(valueIncludes('env'));
const hasVar = both(valueIncludes('var'));

const equalCustomProps = (a, b) =>
  hasConstant(a, b) || hasEnv(a, b) || hasVar(a, b);

export default equalCustomProps;
