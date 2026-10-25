import type { ValueBuffer } from '../../values/valueBuffer.js';
export type Structure = NonNullable<ReturnType<ValueBuffer['structure']>>;
export type ColorStop = {
    /**
     * Comma-separated argument the stop came from.
     */
    argIndex: number;
    /**
     * Index of the colour's last token.
     */
    colorEnd: number;
    /**
     * Indexes of the positions following the colour.
     */
    position: readonly number[];
};
/**
 * Shortens the gradients of one value. Comments that PostCSS's parse drops
 * are dropped with the edits, so a rewritten value matches the parsed text.
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