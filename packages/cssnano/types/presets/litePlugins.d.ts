export type LitePluginOptions = Pick<import('./defaultPlugins.js').DefaultPluginOptions, 'discardComments' | 'normalizeWhitespace' | 'discardEmpty' | 'rawCache'>;
/**
 * The options of each plugin in the lite preset. They are the default preset's
 * options for the plugins they share, so the settings of a plugin cannot differ.
 * @typedef {Pick<import('./defaultPlugins.js').DefaultPluginOptions, 'discardComments' | 'normalizeWhitespace' | 'discardEmpty' | 'rawCache'>} LitePluginOptions
 */
/**
 * The plugins of the lite preset, in the order they run, each with the
 * preset option that enables it.
 */
export declare const litePluginEntries: readonly [readonly [{
    create(options: import("../plugins/postcss-discard-comments/index.js").Options): {
        comments(): (text: string) => boolean;
    };
}, "discardComments", {
    readonly optionKeys: readonly ["removeAll", "removeAllButFirst", "remove"];
}], readonly [{
    create: () => import("../pipeline/host.js").Stage;
}, "normalizeWhitespace", {
    readonly optionKeys: readonly [];
    readonly walk: true;
    readonly after: true;
}], readonly [{
    readonly create: (options: Record<string, never>) => Record<string, never>;
}, "discardEmpty", {
    readonly optionKeys: readonly [];
    readonly transform: true;
    readonly after: true;
}], readonly [{
    readonly create: (options: Record<string, never>) => Record<string, never>;
}, "rawCache", {
    readonly optionKeys: readonly [];
    readonly transform: true;
    readonly after: true;
}]];
//# sourceMappingURL=litePlugins.d.ts.map