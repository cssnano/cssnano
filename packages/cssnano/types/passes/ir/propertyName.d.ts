/**
 * The spelling a name with escapes denotes, case kept. Engines match a
 * property by that spelling, so `\61 ll` is `all`. A name that is not one
 * identifier, such as a malformed escape, denotes nothing.
 *
 * @param {string} prop - a name containing an escape
 * @return {string | undefined}
 */
export declare function decodeEscapes(prop: string): string | undefined;
/**
 * The key that compares and indexes a property name. Escapes are decoded
 * first. Standard names are ASCII case-insensitive, so they fold; custom
 * properties are case-sensitive and keep their spelling.
 *
 * @param {string} prop
 * @return {string}
 */
export declare function propertyNameKey(prop: string): string;
/**
 * True for the `all` shorthand, which resets every property but two.
 *
 * @param {string} prop
 * @return {boolean}
 */
export declare function isAllName(prop: string): boolean;
//# sourceMappingURL=propertyName.d.ts.map