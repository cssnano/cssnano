import type { CSSToken } from '@csstools/css-tokenizer';
import type { ValueComponent } from './componentRanges.js';
export type ComponentClassifier = (text: string, tokens: readonly CSSToken[] | undefined, start: number, end: number) => boolean;
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {ValueComponent} from './componentRanges.js' */
/**
 * The classifiers take a component's text and, for a component with a `(`, the
 * tokens of its range in the list that spells the component.
 *
 * @typedef {(text: string, tokens: readonly CSSToken[] | undefined, start: number, end: number) => boolean} ComponentClassifier
 */
/**
 * @param {string | undefined} value
 * @return {boolean}
 */
declare function isBorderStyle(value: string | undefined): boolean;
/** @type {ComponentClassifier} */
declare function isBorderWidth(text: string, tokens: readonly CSSToken[] | undefined, start: number, end: number): boolean;
/** @type {ComponentClassifier} */
declare function isColor(text: string, tokens: readonly CSSToken[] | undefined, start: number, end: number): boolean;
/**
 * Any two components a value names make it valid; the parser reports which
 * ones it named, so this reads no string again.
 *
 * @param {{specified: {width: boolean, style: boolean, color: boolean}}} wscs
 * @return {boolean}
 */
declare function isValidWidthStyleColor(wscs: {
    specified: {
        width: boolean;
        style: boolean;
        color: boolean;
    };
}): boolean;
/**
 * Whether one component names the border component, or is a substitution that
 * may stand for it.
 *
 * @param {ValueComponent} part
 * @param {string} component one of `borderComponents`
 * @return {boolean}
 */
declare function namesComponent(part: ValueComponent, component: string): boolean;
/**
 * A property that names one component takes one token, so a value of several
 * specifies nothing however well each token reads on its own: the browser
 * ignores `border-left-color: red blue` whole.
 *
 * @param {string} value
 * @param {readonly CSSToken[] | undefined} tokens the tokens `value` spells
 * @param {string} component one of `borderComponents`
 * @return {boolean} whether the value can be what that component is set to
 */
declare function specifiesComponent(value: string, tokens: readonly CSSToken[] | undefined, component: string): boolean;
export { isBorderStyle, isBorderWidth, isColor, isValidWidthStyleColor, namesComponent, specifiesComponent, };
//# sourceMappingURL=validateWsc.d.ts.map