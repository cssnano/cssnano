import { colord, extend, getFormat } from 'colord';
import namesPlugin from 'colord/plugins/names';
import getShortestString from './getShortestString';

let minifierPlugin = (Colord) => {
  /**
   * Shortens a color to 3 or 4 digit hexadecimal string if it's possible.
   * Returns the original (6 or 8 digit) hex if the it can't be shortened.
   */
  Colord.prototype.toShortHex = function () {
    let hex = this.toHex();
    let [, r1, r2, g1, g2, b1, b2, a1, a2] = hex.split('');

    // Check if the string can be shorten
    if (r1 === r2 && g1 === g2 && b1 === b2) {
      if (this.alpha() === 1) {
        // Express as 3 digit hexadecimal string if the color doesn't have an alpha channel
        return '#' + r1 + g1 + b1;
      } else if (a1 === a2) {
        // Format 4 digit hex
        return '#' + r1 + g1 + b1 + a1;
      }
    }

    return hex;
  };

  /**
   * Returns the shortest representation of a color.
   */
  Colord.prototype.toShortString = function ({ isLegacy }) {
    let { r, g, b, a } = this.toRgb();

    // Hexadecimal, RGB[A] and HSL[A] notations
    let options = [this.toShortHex(), this.toRgbString(), this.toHslString()];

    // CSS keywords
    if (!isLegacy && r === 0 && g === 0 && b === 0 && a === 0) {
      options.push('transparent');
    } else if (a === 1) {
      let name = this.toName();
      if (name) {
        options.push(name);
      }
    }

    // Look for the shortest option
    return getShortestString(options);
  };
};

extend([namesPlugin, minifierPlugin]);

export { colord as process, getFormat };
