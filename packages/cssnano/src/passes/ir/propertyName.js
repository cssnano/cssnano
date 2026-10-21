import cssnanoUtils from '#utils';

const { TokenType, asciiLowerCase, decoded, tokens } = cssnanoUtils;

/**
 * The spelling a name with escapes denotes, case kept. Engines match a
 * property by that spelling, so `\61 ll` is `all`. A name that is not one
 * identifier, such as a malformed escape, denotes nothing.
 *
 * @param {string} prop - a name containing an escape
 * @return {string | undefined}
 */
export function decodeEscapes(prop) {
  const propertyTokens = tokens(prop);
  const [property] = propertyTokens;
  if (propertyTokens.length !== 1 || property?.[0] !== TokenType.Ident) {
    return undefined;
  }
  return decoded(property);
}

/**
 * The key that compares and indexes a property name. Escapes are decoded
 * first. Standard names are ASCII case-insensitive, so they fold; custom
 * properties are case-sensitive and keep their spelling.
 *
 * @param {string} prop
 * @return {string}
 */
export function propertyNameKey(prop) {
  const name = prop.includes('\\') ? (decodeEscapes(prop) ?? prop) : prop;
  return name.startsWith('--') ? name : asciiLowerCase(name);
}

/**
 * True for the `all` shorthand, which resets every property but two.
 *
 * @param {string} prop
 * @return {boolean}
 */
export function isAllName(prop) {
  return propertyNameKey(prop) === 'all';
}
