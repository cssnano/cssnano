import { curry, equals, prop } from 'ramda';

// Safe variant of R.propEq to handle null/undefined
const eqProps = curry((p, a, x) => equals(prop(p, x), a));

export default eqProps;
