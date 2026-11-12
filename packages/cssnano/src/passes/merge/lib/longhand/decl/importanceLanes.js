import cssnanoUtils from '#utils';
import { decodeEscapes, isAllName } from '../../../../ir/propertyName.js';

/** @import {BlockDeclarations} from '../blockDeclarations.js'; */

const { asciiLowerCase } = cssnanoUtils;

/**
 * Property names are CSS identifiers, so engines match their decoded
 * spelling: `\61 ll` is `all`. A malformed name matches no property.
 *
 * @param {string} prop - a name containing an escape
 * @return {string | undefined}
 */
export function decodedPropertyName(prop) {
  const name = decodeEscapes(prop);
  return name === undefined ? undefined : asciiLowerCase(name);
}

/**
 * @param {{ prop: string }} declaration a declaration item
 * @return {boolean}
 */
export function isAll(declaration) {
  return isAllName(declaration.prop);
}

/**
 * Whether a property occurs twice without an `all` reset in between.
 *
 * @param {BlockDeclarations} list
 * @param {readonly number[]} laneDecls positions in `list`
 * @return {boolean}
 */
export function repeatsProperty(list, laneDecls) {
  const seen = new Set();
  for (const position of laneDecls) {
    const decl = list.at(position);
    if (isAll(decl)) {
      seen.clear();
      continue;
    }
    const prop = asciiLowerCase(decl.prop);
    if (seen.has(prop)) return true;
    seen.add(prop);
  }
  return false;
}

/**
 * @param {BlockDeclarations} list
 * @param {readonly number[]} declarations positions in `list`
 * @return {boolean} whether a declaration other than `all` is present, so that
 * a lane of only `all` declarations can be skipped
 */
export function hasNonAll(list, declarations) {
  for (const position of declarations) {
    if (!isAll(list.at(position))) return true;
  }
  return false;
}
