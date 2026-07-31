'use strict';
/**
 *  Returns whether the rule contains every property.
 *
 * @type {(rule: import('postcss').Declaration[], ...props: string[]) => boolean}
 *
 * @returns {boolean}
 * */
module.exports = (rule, ...props) => {
  return props.every((p) =>
    rule.some((node) => node.prop && node.prop.toLowerCase().includes(p))
  );
};
