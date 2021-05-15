import { colord, extend, getFormat } from 'colord';
import namesPlugin from 'colord/plugins/names';
import toShorthand from './lib/toShorthand';

extend([namesPlugin]);

export default (colour, isLegacy = false) => {
  if (getFormat(colour) === 'rgb') {
    /* check that it is a valid CSS value
     https://www.w3.org/TR/css-color-4/#rgb-functions */
    let percentCount = 0;
    for (const c of colour) {
      if (c === '%') {
        percentCount++;
      }
    }
    // rgb values should either be all percentages or all numbers
    if (percentCount !== 3 && percentCount !== 0) {
      return colour;
    }
  }

  const parsed = colord(colour.toLowerCase());
  if (parsed.isValid()) {
    const alpha = parsed.alpha();
    if (alpha === 1) {
      const toHex = toShorthand(parsed.toHex());
      const toName = parsed.toName();
      if (toName && toName.length < toHex.length) {
        return toName;
      } else {
        return toHex;
      }
    } else {
      const rgb = parsed.toRgb();

      if (!isLegacy && !rgb.r && !rgb.g && !rgb.b && !alpha) {
        return 'transparent';
      }

      let hsla = parsed.toHslString();
      let rgba = parsed.toRgbString();

      const shortestConversion = hsla.length < rgba.length ? hsla : rgba;

      let result;
      if (colour.length < shortestConversion.length) {
        result = colour;
      } else {
        result = shortestConversion;
      }
      return result;
    }
  } else {
    // Possibly malformed, so pass through
    return colour;
  }
};
