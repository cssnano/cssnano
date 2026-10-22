import type { ValueBuffer } from '../../values/valueBuffer.js';
export type Structure = NonNullable<ReturnType<ValueBuffer['structure']>>;
export type ColorStop = {
    /**
     * Comma-separated argument the stop came from.
     */
    argIndex: number;
    /**
     * Offset just past the colour in the declaration value.
     */
    colorEnd: number;
    /**
     * Positions following the colour.
     */
    position: readonly number[];
};
/**
 * The stage keeps no state between values, so every run shares its reducer.
 * It reads every property, as gradients can appear in any of them.
 *
 * @type {import('../../pipeline/host.js').StageDescriptor}
 */
declare const minifyGradients: import('../../pipeline/host.js').StageDescriptor;
export { minifyGradients as default };
//# sourceMappingURL=index.d.ts.map