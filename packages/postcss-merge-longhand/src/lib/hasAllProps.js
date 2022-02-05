'use strict';
module.exports = (rule, ...props) => {
  return props.every((p) =>
    rule.some(({ prop }) => prop && prop.toLowerCase().includes(p))
  );
};
