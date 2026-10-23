import type { Plugin } from 'postcss';
import type { ValueBuffer } from '../values/valueBuffer.js';
export type Reducer = (buffer: ValueBuffer, context: number) => void;
export type Warn = (message: string, plugin?: string) => void;
export type TextReducer = (text: string, context: number, warn: Warn) => string;
export type Stage = {
    forProperty?: (property: string) => Reducer | null;
    forAtRule?: (name: string) => TextReducer | null;
    selector?: TextReducer;
    comments?: () => (comment: string) => boolean;
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