import { curry, flip, map } from 'ramda';

export const formatPropLeft = curry((left, right) => `${left}-${right}`);
export const formatPropsLeft = curry((left, list) =>
  map(formatPropLeft(left), list)
);

export const formatPropRight = flip(formatPropLeft);
export const formatPropsRight = curry((right, list) =>
  map(formatPropRight(right), list)
);
