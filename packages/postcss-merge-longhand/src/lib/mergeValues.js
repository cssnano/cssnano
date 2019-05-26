import * as R from 'ramda';
import getValue from './getValue';

export default R.compose(
  R.join(' '),
  R.map(getValue)
);
