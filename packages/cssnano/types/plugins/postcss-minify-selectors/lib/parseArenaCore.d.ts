declare const balancedStructure: typeof import("../../../utils/value.js").balancedStructure;
export type ListMode = import('./arena.js').ListMode;
export type ParseStatus = import('./arena.js').ParseStatus;
export type SemanticFacts = import('./arena.js').SemanticFacts;
export type Specificity = import('./arena.js').Specificity;
export type Structure = NonNullable<ReturnType<typeof balancedStructure>>;
export type ParseContext = {
    mode?: ListMode;
    keyframe?: boolean;
    hasDefaultNamespace?: boolean;
    verifyArena?: boolean;
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
export type CombinatorWork = {
    kind: 'combinator';
    start: number;
    end: number;
    value: string;
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
    payload: import('./arena.js').QualifiedNamePayload;
};
export type RawWork = {
    kind: 'raw';
    start: number;
    end: number;
    status: ParseStatus;
};
export type PseudoWork = {
    kind: 'pseudo';
    start: number;
    end: number;
    mode: ListMode;
    insideHas: boolean;
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
export type ParseWork = ListWork | ComplexWork | CompoundWork | CombinatorWork | AttributeWork | NamedSimpleWork | QualifiedNameWork | RawWork | PseudoWork | CloseWork;
/**
 * @param {string} source
 * @param {ParseContext} [context]
 * @param {readonly import('@csstools/css-tokenizer').CSSToken[]} [sourceTokens] the tokens that spell `source`, read instead of tokenizing it
 * @param {number} [start] where the selector starts in `sourceTokens`
 * @param {number} [end] where the selector ends in `sourceTokens`
 */
export declare function parseSelectorArena(source: string, context?: ParseContext, sourceTokens?: readonly import('@csstools/css-tokenizer').CSSToken[], start?: number, end?: number): import("./arena.js").SelectorArena;
export {};
//# sourceMappingURL=parseArenaCore.d.ts.map