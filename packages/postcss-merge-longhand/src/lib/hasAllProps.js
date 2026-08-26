/**
 * @param {import('postcss').Declaration[]} rule
 * @param {...string} props
 */
export default (rule, ...props) => {
  return props.every((p) =>
    rule.some((node) => node.prop.toLowerCase().includes(p))
  );
};
