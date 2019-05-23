import color from 'color';
import * as R from 'ramda';
import keywords from './keywords.json';
import cacheFn from './lib/cacheFn';
import toShorthand from './lib/toShorthand';
import shorter from './lib/shorter';

export default cacheFn((colour, isLegacy) => {
  try {
    const parsed = color(colour.toLowerCase());
    const alpha = parsed.alpha();

    if (alpha === 1) {
      const toHex = toShorthand(parsed.hex().toLowerCase());
      return shorter(keywords[toHex], toHex);
    } else {
      const rgb = parsed.rgb();

      if (
        !isLegacy &&
        !rgb.color[0] &&
        !rgb.color[1] &&
        !rgb.color[2] &&
        !alpha
      ) {
        return 'transparent';
      }

      const hsla = parsed.hsl().string();
      const rgba = rgb.string();

      return R.compose(
        R.toLower,
        shorter
      )(hsla, rgba);
    }
  } catch (e) {
    // Possibly malformed, so pass through
    return colour;
  }
});
