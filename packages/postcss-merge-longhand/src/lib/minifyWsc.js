import parseWidthStyleColor from './parseWsc.js';
import minifyTopBottomRightLeft from './minifyTrbl.js';
import {
  isValidWidthStyleColor,
  specifiesDistinctComponents,
} from './validateWsc.js';

const defaultBorderValue = ['medium', 'none', 'currentcolor'];
/** @param {string} cssPropertyValue */
export default (cssPropertyValue) => {
  /* Shortening a value the browser ignores for specifying a component twice, or
   * something that is no component, would put a border on the page that the
   * stylesheet never asked for: `border: 1px 1px` is no `border: 1px`. */
  if (!specifiesDistinctComponents(cssPropertyValue)) {
    return cssPropertyValue;
  }

  const values = parseWidthStyleColor(cssPropertyValue);

  if (!isValidWidthStyleColor(values)) {
    return minifyTopBottomRightLeft(cssPropertyValue);
  }

  const valuesWithSentinel = [...values, ''];
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
