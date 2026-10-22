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
 * Shortens the gradients of one value. The edits index the value as PostCSS
 * parses it, so a rewritten value loses the comments that the parse drops.
 *
 * @param {ValueBuffer} buffer
 */
declare function reduce(buffer: ValueBuffer): void;
/**
 * The stage keeps no state between values. It reads every property, as
 * gradients can appear in any of them.
 *
 * @satisfies {import('../../pipeline/host.js').StageEntry}
 */
declare const minifyGradients: {
    create: () => {
        forProperty: () => typeof reduce;
    };
};
export { minifyGradients as default };
//# sourceMappingURL=index.d.ts.map