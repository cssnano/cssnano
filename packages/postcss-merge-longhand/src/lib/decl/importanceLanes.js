import cssnanoUtils from 'cssnano-utils';

/** @import {Declaration} from 'postcss'; */

const { TokenType, decoded, tokens } = cssnanoUtils;

/**
 * Property names are CSS identifiers, so engines match their decoded
 * spelling: `\61 ll` is `all`. A malformed name matches no property.
 *
 * @param {string} prop - a name containing an escape
 * @return {string | undefined}
 */
export function decodedPropertyName(prop) {
  const propertyTokens = tokens(prop);
  const [property] = propertyTokens;
  if (propertyTokens.length !== 1 || property?.[0] !== TokenType.Ident) {
    return undefined;
  }
  return decoded(property).toLowerCase();
}

/**
 * @param {Declaration} declaration
 * @return {boolean}
 */
export function isAll(declaration) {
  const prop = declaration.prop;
  if (prop.length === 3 && prop.toLowerCase() === 'all') return true;
  return prop.includes('\\') && decodedPropertyName(prop) === 'all';
}

/**
 * @param {Declaration[]} declarations
 * @return {boolean} whether a declaration other than `all` is present, so that
 * a lane of only `all` declarations can be skipped
 */
export function hasNonAll(declarations) {
  for (const declaration of declarations) {
    if (!isAll(declaration)) return true;
  }
  return false;
}
