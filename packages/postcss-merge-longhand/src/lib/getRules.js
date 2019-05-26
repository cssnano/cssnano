import * as R from 'ramda';
import getLastNode from './getLastNode';

const getRules = R.curry((props, properties) =>
  R.compose(
    R.filter(Boolean),
    R.map(getLastNode(props))
  )(properties)
);

export default getRules;
