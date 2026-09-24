import { TokenType } from '@csstools/css-tokenizer';
export type NestingFrame = {
    expectedArgs?: number[];
    argIndex: number;
    close: TokenType;
};
export type FamilyRecord = import('../index.js').FamilyRecord;
/**
 * @param {import('postcss').Declaration} decl
 * @param {NonNullable<ReturnType<typeof import('./grammar.js').classifyDeclaration>>} classification
 * @param {Map<import('postcss').Container, Map<string, FamilyRecord>>} scopes
 * @param {Map<string, FamilyRecord> | null} singleScope
 * @return {void}
 */
declare function rewriteDeclaration(decl: import('postcss').Declaration, classification: NonNullable<ReturnType<typeof import('./grammar.js').classifyDeclaration>>, scopes: Map<import('postcss').Container, Map<string, FamilyRecord>>, singleScope: Map<string, FamilyRecord> | null): void;
export { rewriteDeclaration };
//# sourceMappingURL=valueRewriter.d.ts.map