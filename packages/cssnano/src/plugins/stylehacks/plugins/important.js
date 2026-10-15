import BasePlugin from '../plugin.js';
import { DECL } from '../dictionary/postcss.js';

export default (class Important extends BasePlugin {
  /** @param {import('postcss').Result=} result */
  constructor(result) {
    super('stylehacks-important-ie5.5-7', [DECL], result);
  }
  /**
   * @param {import('postcss').Declaration} decl
   * @return {void}
   */
  detect(decl) {
    const match = decl.value.match(/!\w/v);
    if (match && match.index) {
      const hack = decl.value.substr(match.index, decl.value.length - 1);
      this.push(decl, {
        identifier: '!important',
        hack,
      });
    }
  }
});
