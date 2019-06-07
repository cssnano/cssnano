import * as R from 'ramda';
import filterPrefixes from './filterPrefixes';

// Internet Explorer use :-ms-input-placeholder.
// Microsoft Edge use ::-ms-input-placeholder.
const findMsInputPlaceholder = R.test(/-ms-input-placeholder/i);

const same = R.compose(
  R.join(','),
  R.map(filterPrefixes)
);

const findMsVendor = R.find(findMsInputPlaceholder);

function sameVendor(selectorsA, selectorsB) {
  return (
    same(selectorsA) === same(selectorsB) &&
    !(findMsVendor(selectorsA) && findMsVendor(selectorsB))
  );
}

export default sameVendor;
