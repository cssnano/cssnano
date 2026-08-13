declare const _exports: {
    /**
     * @param {import('postcss').Rule} rule
     * @param {Iterable<import('postcss').Declaration>} declarations the rule's, as
     * the plugin found them
     * @return {void}
     */
    rememberAuthoredValues(rule: import('postcss').Rule, declarations: Iterable<import('postcss').Declaration>): void;
    /**
     * @param {import('postcss').Declaration} declaration
     * @return {boolean} true for a declaration whose rule was never recorded,
     * since nothing then says the plugin invented its value
     */
    isAuthoredValue(declaration: import('postcss').Declaration): boolean;
};
export = _exports;
//# sourceMappingURL=authoredValues.d.ts.map