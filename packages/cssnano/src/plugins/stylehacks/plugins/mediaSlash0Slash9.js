import BasePlugin from '../plugin.js';
import { MEDIA_QUERY } from '../dictionary/identifiers.js';
import { ATRULE } from '../dictionary/postcss.js';

export default (class MediaSlash0Slash9 extends BasePlugin {
  /** @param {import('postcss').Result} result */
  constructor(result) {
    super('stylehacks-media-slash0-slash9-ie5.5-8', [ATRULE], result);
  }

  /**
   * @param {import('postcss').AtRule} rule
   * @return {void}
   */
  detect(rule) {
    const params = rule.params.trim();

    if (params.toLowerCase() === '\\0screen\\,screen\\9') {
      this.push(rule, {
        identifier: MEDIA_QUERY,
        hack: params,
      });
    }
  }
});
