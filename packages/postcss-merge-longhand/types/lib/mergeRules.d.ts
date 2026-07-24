export = mergeRules;
/**
 * @param {import('postcss').Rule} rule
 * @param {string[]} properties
 * @param {(rules: import('postcss').Declaration[], last: import('postcss').Declaration, props: import('postcss').Declaration[]) => boolean} callback
 * @return {void}
 */
declare function mergeRules(rule: import('postcss').Rule, properties: string[], callback: (rules: import('postcss').Declaration[], last: import('postcss').Declaration, props: import('postcss').Declaration[]) => boolean): void;
//# sourceMappingURL=mergeRules.d.ts.map