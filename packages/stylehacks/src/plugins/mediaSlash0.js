import BasePlugin from '../plugin.js';
import { IE_8 } from '../dictionary/browsers.js';
import { MEDIA_QUERY } from '../dictionary/identifiers.js';
import { ATRULE } from '../dictionary/postcss.js';

export default (class MediaSlash0 extends BasePlugin {
  /** @param {import('postcss').Result} result */
  constructor(result) {
    super([IE_8], [ATRULE], result);
  }
  /**
   * @param {import('postcss').AtRule} rule
   * @return {void}
   */
  detect(rule) {
    const params = rule.params.trim();

    if (params.toLowerCase() === '\\0screen') {
      this.push(rule, {
        identifier: MEDIA_QUERY,
        hack: params,
      });
    }
  }
});
