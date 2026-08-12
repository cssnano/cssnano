export = getDeclarationsThatMatchProperties;
/**
 * Returns all declarations for the given CSS properties.
 *
 * @param {import('postcss').Rule} rule
 * @param {Set<string>} properties the CSS properties to search for
 * @return {Set<import('postcss').Declaration>}
 */
declare function getDeclarationsThatMatchProperties(rule: import('postcss').Rule, properties: Set<string>): Set<import('postcss').Declaration>;
//# sourceMappingURL=getDecls.d.ts.map