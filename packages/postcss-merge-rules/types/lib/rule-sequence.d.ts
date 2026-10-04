import type { Container, Root, Rule } from 'postcss';
import type { Placement, RuleLink } from './rule-sequence-types.js';
/** @import {ChildNode, Container, Root, Rule} from 'postcss' */
/** @import {Placement, RuleLink} from './ruleSequenceTypes.js' */
/** @import {Slot} from './slotIndex.js' */
/**
 * Gives a rule that is not in the stylesheet yet the parent it will have, so
 * that stringifying it infers missing raws, such as the last semicolon, from
 * the stylesheet. PostCSS infers them only for a rule that has a parent.
 *
 * The parent does not list the rule among its children. Until the sequence is
 * written, such a rule may only be stringified: `remove()`, `next()` and
 * `parent.index()` would misbehave on it.
 *
 * @param {Rule} rule
 * @param {Container | undefined} container
 * @return {void}
 */
export declare function standInContainer(rule: Rule, container: Container | undefined): void;
/**
 * Every rule of a stylesheet in stylesheet order, including rules nested in
 * other rules, rewritten in place and written back once.
 */
export default class RuleSequence {
    #private;
    /** @type {RuleLink} a sentinel that precedes the first rule */
    head: RuleLink;
    /** @param {Root} root */
    constructor(root: Root);
    /**
     * @param {RuleLink} first
     * @param {RuleLink} second
     * @param {WeakMap<Container, boolean>} outsideDeclarations see
     * `DeclarationScan#declarationBetween`
     * @return {boolean} whether a declaration outside both rules lies between them
     */
    declarationBetween(first: RuleLink, second: RuleLink, outsideDeclarations: WeakMap<Container, boolean>): boolean;
    /**
     * Moves the rule of `second` to the end of the parent of `first`. It follows
     * `first` and holds no nested rules, so passing the rest of that parent
     * leaves the order of the rules unchanged.
     *
     * @param {RuleLink} first
     * @param {RuleLink} second
     * @return {boolean} whether the parents differed
     */
    moveIntoParent(first: RuleLink, second: RuleLink): boolean;
    /**
     * Replaces the pair `first` and the link after it with the rules of
     * `placement`, which are never none.
     *
     * @param {RuleLink} first
     * @param {Placement} placement
     * @return {RuleLink} the link of the first replacement
     */
    replacePair(first: RuleLink, placement: Placement): RuleLink;
    /**
     * Writes the sequence into the stylesheet, rebuilding each changed container
     * once from its children and the rules now in its slots.
     *
     * @return {void}
     */
    write(): void;
}
//# sourceMappingURL=rule-sequence.d.ts.map
