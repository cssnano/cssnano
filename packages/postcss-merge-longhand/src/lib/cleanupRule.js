import * as R from 'ramda';
import getDecls from './getDecls';
import includedIn from './includedIn';
import isDuplicateProperty from './isDuplicateProperty';
import isLowerPrecedenceProperty from './isLowerPrecedenceProperty';
import remove from './remove';

const cleanupRule = R.curry((properties, prop, rule) => {
  let decls = getDecls(rule, [prop].concat(properties));

  while (decls.length) {
    const lastNode = R.last(decls);

    // remove properties of lower precedence
    const lesser = R.filter(isLowerPrecedenceProperty(prop, lastNode), decls);

    lesser.forEach(remove);
    decls = R.reject(includedIn(lesser), decls);

    // remove duplicate properties
    const duplicates = R.filter(isDuplicateProperty(lastNode), decls);

    duplicates.forEach(remove);
    decls = R.reject(
      R.either(R.equals(lastNode), includedIn(duplicates)),
      decls
    );
  }
});

export default cleanupRule;
