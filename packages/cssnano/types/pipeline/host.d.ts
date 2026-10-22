import type { Helpers, Plugin, Root } from 'postcss';
import type { ValueBuffer } from '../values/valueBuffer.js';
export type Reducer = (buffer: ValueBuffer, context: number) => void;
export type Stage = {
    forProperty?: (property: string) => Reducer | null;
    run?: (root: Root, helpers: Helpers) => void;
};
export type StageEntry = {
    create: (options: Record<PropertyKey, unknown>, targets: readonly string[] | undefined) => Stage | null;
};
export type HostMember = {
    entry: StageEntry;
    options: Record<PropertyKey, unknown>;
    targets: boolean;
};
/**
 * @param {readonly HostMember[]} members the stages of one run, in order
 * @returns {Plugin}
 */
export declare function hostPlugin(members: readonly HostMember[]): Plugin;
//# sourceMappingURL=host.d.ts.map