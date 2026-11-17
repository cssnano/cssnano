import cssnanoUtils from '#utils';
import { splitValue } from './valueComponents.js';
import { joinSpelled, spellToken } from './spelledText.js';
import { tokenName } from './shorthandValueGrammar.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Spelled} from './spelledText.js' */

const { TokenType, numeric } = cssnanoUtils;

/**
 * Reduces `<number> / 1`, with an optional leading `auto`, to its number.
 *
 * @param {string} value
 * @param {readonly CSSToken[]} list the tokens of `value`
 * @return {Spelled | null}
 */
export function reduceAspectRatio(value, list) {
  const parsed = splitValue(value, undefined, list);
  if (!parsed) return null;
  const input = parsed.flatMap((part) =>
    part.components.flatMap((component) => component.tokens)
  );
  const significant = input.filter(
    (token) => token[0] !== TokenType.Whitespace
  );
  const offset =
    significant[0]?.[0] === TokenType.Ident &&
    tokenName(significant[0]) === 'auto'
      ? 1
      : 0;
  if (
    significant.length !== offset + 3 ||
    significant[offset]?.[0] !== TokenType.Number ||
    significant[offset + 1]?.[0] !== TokenType.Delim ||
    significant[offset + 1][1] !== '/' ||
    significant[offset + 2]?.[0] !== TokenType.Number
  )
    return null;
  const numerator = numeric(significant[offset]);
  const denominator = numeric(significant[offset + 2]);
  if (
    !numerator ||
    !denominator ||
    numerator.number <= 0 ||
    denominator.number !== 1 ||
    !Number.isFinite(numerator.number) ||
    !Number.isFinite(denominator.number)
  )
    return null;
  const numeratorSpelled = spellToken(value, significant[offset]);
  if (offset)
    return joinSpelled(
      [spellToken(value, significant[0]), numeratorSpelled],
      ' '
    );
  return numeratorSpelled;
}
