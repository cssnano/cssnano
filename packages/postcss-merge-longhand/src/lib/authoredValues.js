'use strict';
const { list } = require('postcss');

/**
 * The values a rule was written with, whole and component by component.
 *
 * Explode fills in the initial value for a component a shorthand leaves out,
 * and merge carries those values along, so a rule ends up holding values the
 * author never wrote — a `border-color: currentcolor` that only ever stood for
 * the colour `border: none` did not name. Those cannot be a fallback for a
 * later declaration, while the components of an authored value can: exploding
 * `border: 1px solid red` puts the author's `red` under `border-top-color`.
 *
 * The value is matched on its own rather than against the property it ended up
 * under, which errs towards calling a value authored, and so towards holding a
 * merge back.
 *
 * @type {WeakMap<import('postcss').Container, Set<string>>}
 */
const authored = new WeakMap();

module.exports = {
  /**
   * @param {import('postcss').Rule} rule
   * @param {Iterable<import('postcss').Declaration>} declarations the rule's, as
   * the plugin found them
   * @return {void}
   */
  rememberAuthoredValues(rule, declarations) {
    /** @type {Set<string>} */
    const values = new Set();

    for (const { value } of declarations) {
      const authoredValue = value.toLowerCase();

      values.add(authoredValue);

      for (const component of list.space(authoredValue)) {
        values.add(component);
      }
    }

    authored.set(rule, values);
  },
  /**
   * @param {import('postcss').Declaration} declaration
   * @return {boolean} true for a declaration whose rule was never recorded,
   * since nothing then says the plugin invented its value
   */
  isAuthoredValue(declaration) {
    const values = declaration.parent && authored.get(declaration.parent);

    return values === undefined || values.has(declaration.value.toLowerCase());
  },
};
