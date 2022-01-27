import BasePlugin from '../plugin';
import { IE_5_5, IE_6, IE_7 } from '../dictionary/browsers';
import { PROPERTY } from '../dictionary/identifiers';
import { ATRULE, DECL } from '../dictionary/postcss';

const hacks = '!_$_&_*_)_=_%_+_,_._/_`_]_#_~_?_:_|'.split('_');

export default class LeadingStar extends BasePlugin {
  constructor(result) {
    super([IE_5_5, IE_6, IE_7], [ATRULE, DECL], result);
  }

  detect(node) {
    if (node.type === DECL) {
      // some values are not picked up by before, so ensure they are
      // at the beginning of the value
      hacks.forEach((hack) => {
        if (!node.prop.indexOf(hack)) {
          this.push(node, {
            identifier: PROPERTY,
            hack: node.prop,
          });
        }
      });
      let { before } = node.raws;
      if (!before) {
        return;
      }
      hacks.forEach((hack) => {
        if (before.includes(hack)) {
          this.push(node, {
            identifier: PROPERTY,
            hack: `${before.trim()}${node.prop}`,
          });
        }
      });
    } else {
      // test for the @property: value; hack
      let { name } = node;
      let len = name.length - 1;
      if (name.lastIndexOf(':') === len) {
        this.push(node, {
          identifier: PROPERTY,
          hack: `@${name.substr(0, len)}`,
        });
      }
    }
  }
}
