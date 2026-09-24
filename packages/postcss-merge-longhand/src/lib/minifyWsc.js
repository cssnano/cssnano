import parseWidthStyleColor from './parseWsc.js';
import minifyTopBottomRightLeft from './minifyTrbl.js';
import { isValidWidthStyleColor } from './validateWsc.js';

const defaultBorderValue = ['medium', 'none', 'currentcolor'];
/** @param {string} cssPropertyValue */
export default (cssPropertyValue) => {
  const values = parseWidthStyleColor(cssPropertyValue);

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

  const valuesWithSentinel = [values.width, values.style, values.color, ''];
  let value = '';
  for (let i = valuesWithSentinel.length - 1; i >= 0; i--) {
    const cur = valuesWithSentinel[i];
    if (
      cur === undefined ||
      (cur.toLowerCase() === defaultBorderValue[i] &&
        (!i ||
          (valuesWithSentinel[i - 1] || '').toLowerCase() !==
            cur.toLowerCase()))
    ) {
      continue;
    }

    value = cur + ' ' + value;
  }
  value = value.trim();

  return minifyTopBottomRightLeft(value || 'none');
};
