import cssnanoUtils from '#utils';
import { isCssWideKeyword } from '../isCssWideKeyword.js';
import {
  family,
  ruleComponent,
  singleComponent,
} from './pairFamilyBuilders.js';

/** @import {PairFamily, Parser} from './pairForms.js'; */
/** @import {CSSToken} from '@csstools/css-tokenizer'; */

const { asciiLowerCase, TokenType } = cssnanoUtils;

/**
 * Identifiers that a `<counter-style-name>` may not be: the position keywords
 * would be read as the position, and the others are reserved.
 */
const reservedTypes = new Set(['inside', 'outside', 'auto', 'default']);

/**
 * A `<counter-style>` or a string. `none` is the type's own keyword, and it
 * is kept, as is any name the browser would parse as a counter style.
 *
 * @type {Parser}
 */
function listStyleType(decl) {
  const trimmed = decl.value.trim();
  if (isCssWideKeyword(trimmed)) return trimmed;
  const component = singleComponent(decl);
  if (component?.tokens.length !== 1) return null;
  const [token] = component.tokens;
  if (token[0] === TokenType.String) return trimmed;
  if (token[0] !== TokenType.Ident) return null;
  return reservedTypes.has(asciiLowerCase(trimmed)) ? null : trimmed;
}

/**
 * Whether the component starts with a `url()`, either as a url token or as a
 * function named url.
 *
 * @param {CSSToken[] | undefined} tokens
 * @return {boolean}
 */
function startsWithUrl(tokens) {
  const first = tokens?.[0];
  if (first === undefined) return false;
  return (
    first[0] === TokenType.URL ||
    (first[0] === TokenType.Function &&
      asciiLowerCase(first[4]?.value ?? '') === 'url')
  );
}

/**
 * The image is `none` or a `url()`. Other images, such as gradients, are left
 * alone.
 *
 * @type {Parser}
 */
const listStyleImage = ruleComponent(
  (text, tokens) => asciiLowerCase(text) === 'none' || startsWithUrl(tokens)
);

/**
 * The position keyword. Each keyword is a whole value, so the grammar takes
 * no other form.
 *
 * @type {Parser}
 */
const listStylePosition = ruleComponent((text) =>
  ['inside', 'outside'].includes(asciiLowerCase(text))
);

/**
 * Position, then image, then type, each omitted at its initial value. A
 * `none` type with a `none` image is a lone `none`, so the position must be
 * outside, or else the lone `none` would set the image too.
 *
 * @param {string[]} values - type, position, image
 * @return {string | null}
 */
function emitListStyle([type, position, image]) {
  const typeKeyword = asciiLowerCase(type);
  const imageNone = asciiLowerCase(image) === 'none';
  if (typeKeyword === 'none' && imageNone) {
    return asciiLowerCase(position) === 'outside' ? 'none' : null;
  }
  const components = [];
  if (asciiLowerCase(position) !== 'outside') components.push(position);
  if (!imageNone) components.push(image);
  if (typeKeyword !== 'disc') components.push(type);
  return components.length ? components.join(' ') : 'disc';
}

/** @type {PairFamily} */
export const listStyleFamily = family(
  'list-style',
  ['list-style-type', 'list-style-position', 'list-style-image'],
  {
    parseValue: [listStyleType, listStylePosition, listStyleImage],
    emit: emitListStyle,
  }
);
