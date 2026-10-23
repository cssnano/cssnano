/** @import {TransformEntry} from '../../pipeline/host.js' */

/**
 * The transform of the walk that discards overridden at-rules. It takes no
 * options. The walk collects the at-rules, and compares their preludes after the
 * stylesheet is folded (see pipeline/overridable.js).
 *
 * @satisfies {TransformEntry}
 */
const discardOverridden = { create: (options) => options };

export { discardOverridden as default };
