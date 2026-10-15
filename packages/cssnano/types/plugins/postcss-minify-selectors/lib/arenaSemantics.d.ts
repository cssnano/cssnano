/** @import {ArenaNode, SemanticFacts, Specificity, SpecificityResult} from './arena.js' */
import type { ArenaNode, SemanticFacts, Specificity, SpecificityResult } from './arena.js';
export declare const semanticFacts: Readonly<{
    namespace: 1;
    pseudoElement: 2;
    vendorPseudo: 4;
    nesting: 8;
    attributeModifier: 16;
    commentDescendant: 32;
    nestedHas: 64;
    function: 128;
    unsafePseudo: 256;
}>;
/** @return {SemanticFacts} */
export declare function createSemanticFacts(): SemanticFacts;
/** @param {SemanticFacts | undefined} facts @param {number} fact */
export declare function hasSemanticFact(facts: SemanticFacts | undefined, fact: number): boolean;
/** @param {SemanticFacts} facts @param {number} fact */
export declare function addSemanticFact(facts: SemanticFacts, fact: number): number;
/** @param {SemanticFacts} left @param {SemanticFacts} right */
export declare function mergeSemanticFacts(left: SemanticFacts, right: SemanticFacts): number;
/** @type {Specificity} */
export declare const ZERO_SPECIFICITY: Specificity;
export declare const EMPTY_FACTS: number;
/** @param {ArenaNode} compound @return {boolean} */
export declare function isFoldEligible(compound: ArenaNode): boolean;
/** @return {Specificity} */
export declare function zeroSpecificity(): Specificity;
/** @param {Specificity} a @param {Specificity} b @return {SpecificityResult} */
export declare function addSpecificity(a: Specificity, b: Specificity): SpecificityResult;
//# sourceMappingURL=arenaSemantics.d.ts.map