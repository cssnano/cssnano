import { colord, extend, getFormat } from 'colord';
import namesPlugin from 'colord/plugins/names';
import getShortestString from './getShortestString';

let minifierPlugin = (Colord) => {
  /**
   * Shortens a color to 3 or 4 digit hexadecimal string if it's possible.
   * Returns the original (6 or 8 digit) hex if the it can't be shortened.
   */
  Colord.prototype.toShortHex = function ({ formatAlpha }) {
    let hex = this.toHex();
    let [, r1, r2, g1, g2, b1, b2, a1, a2] = hex.split('');

    // Check if the string can be shorten
    if (r1 === r2 && g1 === g2 && b1 === b2) {
      if (this.alpha() === 1) {
        // Express as 3 digit hexadecimal string if the color doesn't have an alpha channel
        return '#' + r1 + g1 + b1;
      } else if (formatAlpha && a1 === a2) {
        // Format 4 digit hex
        return '#' + r1 + g1 + b1 + a1;
      }
    }

    return hex;
  };

  /**
   * Returns the shortest representation of a color.
   */
  Colord.prototype.toShortString = function ({
    supportsTransparent,
    supportsAlphaHex,
  }) {
    let { r, g, b } = this.toRgb();
    let a = this.alpha();

    // RGB[A] and HSL[A] functional notations
    let options = [
      this.toRgbString(), // e.g. "rgb(128, 128, 128)" or "rgba(128, 128, 128, 0.5)"
      this.toHslString(), // e.g. "hsl(180, 50%, 50%)" or "hsla(180, 50%, 50%, 0.5)"
    ];

    // Hexadecimal notations
    if (supportsAlphaHex && a < 1) {
      let alphaHex = this.toShortHex({ formatAlpha: true }); // e.g. "#7777" or "#80808080"

      // Output 4 or 8 digit hex only if the color conversion is lossless
      if (colord(alphaHex).alpha() === a) {
        options.push(alphaHex);
      }
    } else if (a === 1) {
      options.push(this.toShortHex({ formatAlpha: false })); // e.g. "#777" or "#808080"
    }

    // CSS keyword
    if (supportsTransparent && r === 0 && g === 0 && b === 0 && a === 0) {
      options.push('transparent');
    } else if (a === 1) {
      let name = this.toName(); // e.g. "gray"
      if (name) {
        options.push(name);
      }
    }

    // Find the shortest option available
    return getShortestString(options);
  };
};

extend([namesPlugin, minifierPlugin]);

export { colord as process, getFormat };
