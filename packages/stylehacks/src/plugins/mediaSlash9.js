import plugin from '../plugin';
import { IE_5_5, IE_6, IE_7 } from '../dictionary/browsers';
import { MEDIA_QUERY } from '../dictionary/identifiers';
import { ATRULE } from '../dictionary/postcss';

export default plugin([IE_5_5, IE_6, IE_7], [ATRULE], function(rule) {
  const params = rule.params.trim();

  if (params.toLowerCase() === 'screen\\9') {
    this.push(rule, {
      identifier: MEDIA_QUERY,
      hack: params,
    });
  }
});
