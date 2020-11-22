import plugin from '../plugin';
import { IE_6 } from '../dictionary/browsers';
import { PROPERTY } from '../dictionary/identifiers';
import { DECL } from '../dictionary/postcss';

function vendorPrefix(prop) {
  let match = prop.match(/^(-\w+-)/);
  if (match) {
    return match[0];
  }

  return '';
}
export default plugin([IE_6], [DECL], function(decl) {
  const { before } = decl.raws;

  if (before && ~before.indexOf('_')) {
    this.push(decl, {
      identifier: PROPERTY,
      hack: `${before.trim()}${decl.prop}`,
    });
  }

  if (
    decl.prop[0] === '-' &&
    decl.prop[1] !== '-' &&
    vendorPrefix(decl.prop) === ''
  ) {
    this.push(decl, {
      identifier: PROPERTY,
      hack: decl.prop,
    });
  }
});
