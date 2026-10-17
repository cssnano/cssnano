import important from './important.js';
import leadingStarDeclaration from './leadingStar.js';
import leadingUnderscore from './leadingUnderscore.js';
import slash9 from './slash9.js';

/** @import {Declaration} from 'postcss'; */

/** @type {readonly ((decl: Declaration) => boolean)[]} */
export const declarationHacks = [
  important,
  leadingStarDeclaration,
  leadingUnderscore,
  slash9,
];
