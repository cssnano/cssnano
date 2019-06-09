import { join, memoizeWith, unapply } from 'ramda';

const cacheFn = memoizeWith(unapply(join('|')));

export default cacheFn;
