/**
 * Key under which a preset tells a plugin which target options the user set
 * on it, so the plugin can warn that the preset's targets replaced them. A
 * symbol keeps this record apart from the plugin options. The symbol is
 * private: a preset only configures plugins from its own package.
 */
export default Symbol('cssnano.presetTargets');

/**
 * The browser target options that only a preset may set. A plugin that a user
 * gave one of them ignores it, so the preset reports it instead.
 */
export const targetOptionKeys = /** @type {const} */ ([
  'overrideBrowserslist',
  'stats',
  'env',
  'path',
]);
