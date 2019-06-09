import { compose, curry, equals, F, ifElse, isNil, toLower } from 'ramda';

const lowercaseEq = curry((keyword, value) =>
  ifElse(
    isNil,
    F,
    compose(
      equals(keyword),
      toLower
    )
  )(value)
);

export default lowercaseEq;
