import cssnanoUtils from 'cssnano-utils';
export type Tokens = Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens'];
/** @typedef {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens']} Tokens */
/** @param {ReturnType<typeof cssnanoUtils.balancedTokens>} structure @return {(number|undefined)[]} */
export declare function parentIndexes(structure: ReturnType<typeof cssnanoUtils.balancedTokens>): (number | undefined)[];
/** @param {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>} structure @param {(number|undefined)[]} parents @param {{start:number,end:number,text:string}[]} changes @return {void} */
export declare function minifyWhitespace(structure: Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>, parents: (number | undefined)[], changes: {
    start: number;
    end: number;
    text: string;
}[]): void;
/** @param {boolean} supports @param {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>} structure @param {(number|undefined)[]} parents @param {{start:number,end:number,text:string}[]} changes @return {void} */
export declare function minifyAspectRatios(supports: boolean, structure: Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>, parents: (number | undefined)[], changes: {
    start: number;
    end: number;
    text: string;
}[]): void;
//# sourceMappingURL=whitespace.d.ts.map