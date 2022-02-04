'use strict';
module.exports = (rule, prop) => {
  return rule.filter((n) => n.prop && n.prop.toLowerCase() === prop).pop();
};
