import plugin from '../plugin';
import { IE_6, IE_7, IE_8 } from '../dictionary/browsers';
import { VALUE } from '../dictionary/identifiers';
import { DECL } from '../dictionary/postcss';

export default plugin([IE_6, IE_7, IE_8], [DECL], function(decl) {
  let v = decl.value;
  if (v && v.length > 2 && v.indexOf('\\9') === v.length - 2) {
    this.push(decl, {
      identifier: VALUE,
      hack: v,
    });
  }
});
