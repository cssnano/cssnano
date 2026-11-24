import { isCssWideKeyword } from './isCssWideKeyword.js';
import isCustomProp from './isCustomProp.js';

/**
 * @param {import('./blockDeclarations.js').DeclarationItem} prop
 * @param {boolean} [includeCustomProps]
 */
export default (prop, includeCustomProps = true) =>
  Boolean(prop.value) &&
  !(includeCustomProps && isCustomProp(prop)) &&
  !isCssWideKeyword(prop.value);
