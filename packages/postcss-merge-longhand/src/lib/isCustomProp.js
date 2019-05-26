import { compose } from 'ramda';
import getValue from './getValue';
import isValueCustomProp from './isValueCustomProp';

const isCustomProp = compose(
  isValueCustomProp,
  getValue
);

export default isCustomProp;
