import { curry, equals, prop } from 'ramda';

// Safe variant of R.eqProps to handle null/undefined
const eqProps = curry((p, a, b) => equals(prop(p, a), prop(p, b)));

export default eqProps;
