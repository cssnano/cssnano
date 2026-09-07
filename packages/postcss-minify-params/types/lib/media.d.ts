import type cssnanoUtils from 'cssnano-utils';
export type Tokens = Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>['tokens'];
/** @param {boolean} legacy @param {Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>} structure @param {{start:number,end:number,text:string}[]} changes @return {boolean} */
export default function minifyMediaAll(legacy: boolean, structure: Exclude<ReturnType<typeof cssnanoUtils.balancedTokens>, undefined>, changes: {
    start: number;
    end: number;
    text: string;
}[]): boolean;
//# sourceMappingURL=media.d.ts.map