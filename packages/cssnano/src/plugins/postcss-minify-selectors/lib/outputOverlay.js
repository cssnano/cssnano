/**
 * Synthetic output belongs to the normalization/serialization layer. Parsed
 * arena nodes contain source structure and semantic facts only.
 *
 * An emit may carry `tokens`: the list that spells its text. Without them, a
 * selector serialized with its tokens has none.
 *
 * @typedef {{kind:'source',start:number,end:number,tokens?:readonly CSSToken[]}|{kind:'text',value:string,tokens?:readonly CSSToken[]}|{kind:'node',node:number}|{kind:'sequence',items:readonly Emit[]}} Emit
 * @import {CSSToken} from '@csstools/css-tokenizer'
 */

export {};
