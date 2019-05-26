import { compose, curry, F, ifElse, isNil, toLower } from 'ramda';
import includedIn from './includedIn';

const oneOf = curry((keywords, value) =>
  ifElse(
    isNil,
    F,
    compose(
      includedIn(keywords),
      toLower
    )
  )(value)
);

export default oneOf;
