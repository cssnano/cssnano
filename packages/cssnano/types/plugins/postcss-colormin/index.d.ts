export type MinifyColorOptions = {
    /**
     * Allows hexadecimal output, such as `#f00`. (default: true)
     */
    hex?: boolean;
    /**
     * Allows 4 and 8 digit hexadecimal output for translucent colors. (default: whether the browser targets support it)
     */
    alphaHex?: boolean;
    /**
     * Allows `rgb()` and `rgba()` output. (default: true)
     */
    rgb?: boolean;
    /**
     * Allows `hsl()` and `hsla()` output. (default: true)
     */
    hsl?: boolean;
    /**
     * Allows named colors, such as `red`. (default: true)
     */
    name?: boolean;
    /**
     * Allows the `transparent` keyword for a fully transparent color. Unknown browser targets keep `rgba()`. (default: whether the browser targets know `transparent`)
     */
    transparent?: boolean;
    /**
     * Minifies colors inside custom property values (`--*`). (default: true)
     */
    transformCustomProperties?: boolean;
};
export type Options = MinifyColorOptions;
/**
 * Compiles the supported color forms for the browser targets.
 *
 * @param {Options} config
 * @param {readonly string[] | undefined} browsers
 * @return {import('../../pipeline/host.js').Stage}
 */
declare function compileColormin(config: Options, browsers: readonly string[] | undefined): import('../../pipeline/host.js').Stage;
/** @satisfies {import('../../pipeline/host.js').StageEntry} */
declare const colormin: {
    create: typeof compileColormin;
};
export { colormin as default };
//# sourceMappingURL=index.d.ts.map