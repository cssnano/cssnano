import type { CSSToken } from '@csstools/css-tokenizer';
import type { Stage } from '../../pipeline/host.js';
export type UrlVisitor = (start: number, end: number, decoded: string, quote: string, nameToken: CSSToken | undefined) => void;
/** @satisfies {StageEntry} */
declare const urlEntry: {
    create: () => Stage;
};
export { urlEntry as default };
//# sourceMappingURL=index.d.ts.map