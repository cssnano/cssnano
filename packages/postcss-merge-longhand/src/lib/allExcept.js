import { curry, equals, reject } from 'ramda';

const allExcept = curry((elem, list) => reject(equals(elem), list));

export default allExcept;
