import cssnanoUtils from 'cssnano-utils';
import { buildSelectorArena, SelectorArena } from './arena.js';
/** @type {typeof cssnanoUtils.balancedTokens} */
declare const balancedTokens: typeof cssnanoUtils.balancedTokens;
export type ListMode = import('./arena.js').ListMode;
export type ParseStatus = import('./arena.js').ParseStatus;
export type SemanticFacts = import('./arena.js').SemanticFacts;
export type Specificity = import('./arena.js').Specificity;
export type QualifiedNamePayload = import('./arena.js').QualifiedNamePayload;
export type Structure = NonNullable<ReturnType<typeof balancedTokens>>;
export type Builder = Parameters<Parameters<typeof buildSelectorArena>[2]>[0];
export type ParseContext = {
    mode?: ListMode;
    keyframe?: boolean;
    hasDefaultNamespace?: boolean;
    structureOnly?: boolean;
};
export type ListWork = {
    kind: 'list';
    start: number;
    end: number;
    mode: ListMode;
    argumentPayload?: number;
    insideHas: boolean;
};
export type ComplexWork = {
    kind: 'complex';
    start: number;
    end: number;
    mode: ListMode;
    status?: ParseStatus;
    insideHas: boolean;
};
export type CompoundWork = {
    kind: 'compound';
    start: number;
    end: number;
    mode: ListMode;
    insideHas: boolean;
};
export type PseudoWork = {
    kind: 'pseudo';
    start: number;
    end: number;
    mode: ListMode;
    insideHas: boolean;
};
export type AttributeWork = {
    kind: 'attribute';
    start: number;
};
export type NamedSimpleWork = {
    kind: 'class' | 'id' | 'nesting';
    start: number;
    end: number;
};
export type QualifiedNameWork = {
    kind: 'qualified-name';
    start: number;
    end: number;
    payload: QualifiedNamePayload;
};
export type RawWork = {
    kind: 'raw';
    start: number;
    end: number;
    status: ParseStatus;
};
export type CombinatorWork = {
    kind: 'combinator';
    start: number;
    end: number;
    value: string;
};
export type CloseWork = {
    kind: 'close';
    node: number;
    role: 'list' | 'complex' | 'compound' | 'pseudo';
    mode?: ListMode;
    status?: ParseStatus;
    facts?: SemanticFacts;
    specificity?: Specificity;
};
export type ParseWork = ListWork | ComplexWork | CompoundWork | PseudoWork | AttributeWork | NamedSimpleWork | QualifiedNameWork | RawWork | CombinatorWork | CloseWork;
/** @param {string} source @param {ParseContext} [context] */
export declare function parseSelectorArena(source: string, context?: ParseContext): SelectorArena;
export {};
//# sourceMappingURL=parseArena.d.ts.map