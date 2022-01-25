import BasePlugin from '../plugin';
import { IE_8 } from '../dictionary/browsers';
import { MEDIA_QUERY } from '../dictionary/identifiers';
import { ATRULE } from '../dictionary/postcss';

export default class MediaSlash0 extends BasePlugin {
  constructor(result) {
    super([IE_8], [ATRULE], result);
  }

  detect(rule) {
    const params = rule.params.trim();

    if (params.toLowerCase() === '\\0screen') {
      this.push(rule, {
        identifier: MEDIA_QUERY,
        hack: params,
      });
    }
  }
}
