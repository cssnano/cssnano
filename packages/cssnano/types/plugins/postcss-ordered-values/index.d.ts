import { tokenizeValue } from './lib/tokenize.js';
import type { CSSToken } from '@csstools/css-tokenizer';
import type { Stage } from '../../pipeline/host.js';
export type Processor = (parsed: ReturnType<typeof tokenizeValue>) => CSSToken[] | null;
/** @satisfies {StageEntry} */
declare const orderedValues: {
    create: () => Stage;
};
export { orderedValues as default };
//# sourceMappingURL=index.d.ts.map