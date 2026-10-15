import BasePlugin from '../plugin.js';
import { VALUE } from '../dictionary/identifiers.js';
import { DECL } from '../dictionary/postcss.js';

export default (class Slash9 extends BasePlugin {
  /** @param {import('postcss').Result=} result */
  constructor(result) {
    super('stylehacks-slash9-ie6-8', [DECL], result);
  }

  /**
   * @param {import('postcss').Declaration} decl
   * @return {void}
   */
  detect(decl) {
    const v = decl.value;
    if (v && v.length > 2 && v.indexOf('\\9') === v.length - 2) {
      this.push(decl, {
        identifier: VALUE,
        hack: v,
      });
    }
  }
});
