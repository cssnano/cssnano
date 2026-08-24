export default (rule, ...props) => {
  return props.every((p) =>
    rule.some((node) => node.prop && node.prop.toLowerCase().includes(p))
  );
};
