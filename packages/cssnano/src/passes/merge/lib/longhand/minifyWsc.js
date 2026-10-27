import cssnanoUtils from '#utils';
import parseWidthStyleColor from './parseWsc.js';
import minifyTopBottomRightLeft from './minifyTrbl.js';
import { isValidWidthStyleColor } from './validateWsc.js';

const { asciiLowerCase } = cssnanoUtils;

const defaultBorderValue = ['medium', 'none', 'currentcolor'];

/**
 * Shortens a width, style and color that name the border's components, by
 * dropping each one that spells its initial value unless the component before
 * it spells the same text.
 *
 * @param {string | undefined} width the width as written, or undefined when unnamed
 * @param {string | undefined} style the style as written, or undefined when unnamed
 * @param {string | undefined} color the color as written, or undefined when unnamed
 * @return {string}
 */
export function minifyComponents(width, style, color) {
  const valuesWithSentinel = [width, style, color, ''];
  let value = '';
  for (let i = valuesWithSentinel.length - 1; i >= 0; i--) {
    const cur = valuesWithSentinel[i];
    if (
      cur === undefined ||
      (asciiLowerCase(cur) === defaultBorderValue[i] &&
        (!i ||
          asciiLowerCase(valuesWithSentinel[i - 1] || '') !==
            asciiLowerCase(cur)))
    ) {
      continue;
    }

    value = cur + ' ' + value;
  }
  value = value.trim();

  return minifyTopBottomRightLeft(value || 'none');
}

/**
 * @param {string} cssPropertyValue
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [tokens] the tokens
 * `cssPropertyValue` spells
 */
export default (cssPropertyValue, tokens) => {
  const values = parseWidthStyleColor(cssPropertyValue, tokens);

  /* Shortening a value the browser ignores — a component specified twice, or
   * a token that is no component — would put a border on the page that the
   * stylesheet never asked for: `border: 1px 1px` is no `border: 1px`. */
  if (!values) {
    return cssPropertyValue;
  }

  /* A specification that leaves two or more components unnamed is read
   * top/right/bottom/left instead; for the single tokens that reach here
   * (`border: 1px`) that pass-through is a no-op. */
  if (!isValidWidthStyleColor(values)) {
    return minifyTopBottomRightLeft(cssPropertyValue);
  }

  return minifyComponents(values.width, values.style, values.color);
};
