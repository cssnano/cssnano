import BasePlugin from '../plugin.js';
import { IE_6, IE_7, IE_8 } from '../dictionary/browsers';
import { VALUE } from '../dictionary/identifiers';
import { DECL } from '../dictionary/postcss';

export default class Slash9 extends BasePlugin {
  constructor(result) {
    super([IE_6, IE_7, IE_8], [DECL], result);
  }

  detect(decl) {
    let v = decl.value;
    if (v && v.length > 2 && v.indexOf('\\9') === v.length - 2) {
      this.push(decl, {
        identifier: VALUE,
        hack: v,
      });
    }
  }
}
