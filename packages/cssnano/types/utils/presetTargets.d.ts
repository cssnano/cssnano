/**
 * Key under which a preset tells a plugin which target options the user set
 * on it, so the plugin can warn that the preset's targets replaced them. A
 * symbol keeps this record apart from the plugin options. The symbol is
 * private: a preset only configures plugins from its own package.
 */
declare const _default: symbol;
export default _default;
/**
 * The browser target options that only a preset may set. A plugin that a user
 * gave one of them ignores it, so the preset reports it instead.
 */
export declare const targetOptionKeys: readonly ['overrideBrowserslist', 'stats', 'env', 'path'];
//# sourceMappingURL=presetTargets.d.ts.map