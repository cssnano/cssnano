import cssnanoUtils from '#utils';
export type Tokens = Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens'];
export type Structure = Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>;
/** @param {boolean} legacy @param {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>} structure @param {{startIndex:number,endIndex:number}[]} segments @param {{start:number,end:number,text:string}[]} changes @return {boolean} */
export default function minifyMediaAll(legacy: boolean, structure: Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>, segments: {
    startIndex: number;
    endIndex: number;
}[], changes: {
    start: number;
    end: number;
    text: string;
}[]): boolean;
export type Feature = {
    open: number;
    close: number;
    and: number | undefined;
};
/**
 * Drops `min-*` and `max-*` features that another feature in the same
 * conjunction already implies, such as `(min-width:320px)` in
 * `(min-width:768px) and (min-width:320px)`. Only a plain `and`-joined
 * conjunction is changed, and only features with the same name and unit are
 * compared, so every other query stays byte-identical.
 *
 * Edits are added to `changes`. Their ranges never overlap the edits that
 * minifyMediaAll adds for the same query.
 *
 * @param {Structure} structure
 * @param {{startIndex: number, endIndex: number}[]} segments the top-level comma-separated queries
 * @param {{start: number, end: number, text: string}[]} changes
 * @return {void}
 */
export declare function dropRedundantRangeFeatures(structure: Structure, segments: {
    startIndex: number;
    endIndex: number;
}[], changes: {
    start: number;
    end: number;
    text: string;
}[]): void;
//# sourceMappingURL=media.d.ts.map