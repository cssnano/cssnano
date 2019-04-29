export default (rule, ...props) => {
  return props.every((p) =>
    rule.some(({ prop }) => prop && ~prop.toLowerCase().indexOf(p))
  );
};
