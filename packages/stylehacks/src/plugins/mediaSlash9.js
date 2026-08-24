import BasePlugin from '../plugin.js';
import { IE_5_5, IE_6, IE_7 } from '../dictionary/browsers.js';
import { MEDIA_QUERY } from '../dictionary/identifiers.js';
import { ATRULE } from '../dictionary/postcss.js';

export default (class MediaSlash9 extends BasePlugin {
  /** @param {import('postcss').Result=} result */
  constructor(result) {
    super([IE_5_5, IE_6, IE_7], [ATRULE], result);
  }

  /**
   * @param {import('postcss').AtRule} rule
   * @return {void}
   */
  detect(rule) {
    const params = rule.params.trim();

    if (params.toLowerCase() === 'screen\\9') {
      this.push(rule, {
        identifier: MEDIA_QUERY,
        hack: params,
      });
    }
  }
});
