import BasePlugin from '../plugin.js';
import { IE_5_5, IE_6, IE_7 } from '../dictionary/browsers.js';
import { PROPERTY } from '../dictionary/identifiers.js';
import { ATRULE, DECL } from '../dictionary/postcss.js';

/** @import {Declaration, AtRule} from 'postcss'; */

const hacks = '!_$_&_*_)_=_%_+_,_._/_`_]_#_~_?_:_|'.split('_');
export default (class LeadingStar extends BasePlugin {
  /** @param {import('postcss').Result=} result */
  constructor(result) {
    super([IE_5_5, IE_6, IE_7], [ATRULE, DECL], result);
  }

  /**
   * @param {Declaration | AtRule} node
   * @return {void}
   */
  detect(node) {
    if (node.type === DECL) {
      // some values are not picked up by before, so ensure they are
      // at the beginning of the value
      for (const hack of hacks) {
        if (!(/** @type Declaration */ (node).prop.indexOf(hack))) {
          this.push(node, {
            identifier: PROPERTY,
            hack: /** @type Declaration */ (node).prop,
          });
        }
      }
      const { before } = node.raws;
      if (!before) {
        return;
      }
      for (const hack of hacks) {
        if (before.includes(hack)) {
          this.push(node, {
            identifier: PROPERTY,
            hack: `${before.trim()}${/** @type Declaration */ (node).prop}`,
          });
        }
      }
    } else {
      // test for the @property: value; hack
      const { name } = /** @type AtRule */ (node);
      const len = name.length - 1;
      if (name.lastIndexOf(':') === len) {
        this.push(node, {
          identifier: PROPERTY,
          hack: `@${name.substr(0, len)}`,
        });
      }
    }
  }
});
