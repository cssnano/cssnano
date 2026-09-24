import type { Container, Declaration } from 'postcss';
/**
 * @param {string[]} cells
 * @param {Set<Declaration>[]} cellHistory
 * @param {Set<number>} touched
 * @param {Set<number>} barrierCells
 * @param {boolean} hasReset
 * @param {boolean} lane
 * @param {Set<Declaration>} fallbacks
 */
export declare function generateCandidates(cells: string[], cellHistory: Set<Declaration>[], touched: Set<number>, barrierCells: Set<number>, hasReset: boolean, lane: boolean, fallbacks: Set<Declaration>): {
    decls: {
        prop: string;
        value: string;
    }[];
    rank: number;
    mask: number;
    coveredCells: Set<number>;
}[];
/**
 * @param {{ decls: { prop: string, value: string }[], rank: number, mask: number, resetIndex?: number, coveredCells: Set<number> }[]} candidates
 * @param {Set<Declaration>[]} cellHistory
 * @param {Set<Declaration>} fallbacks
 * @param {Set<number>} touched
 * @param {boolean} lane
 * @param {Declaration[]} segment
 * @return {{ cand: (typeof candidates)[0], repList: Declaration[], removable: Declaration[], diff: number, size: number, fallbacks: Set<Declaration> } | null}
 */
export declare function selectBestCandidate(candidates: {
    decls: {
        prop: string;
        value: string;
    }[];
    rank: number;
    mask: number;
    resetIndex?: number;
    coveredCells: Set<number>;
}[], cellHistory: Set<Declaration>[], fallbacks: Set<Declaration>, touched: Set<number>, lane: boolean, segment: Declaration[]): {
    cand: (typeof candidates)[0];
    repList: Declaration[];
    removable: Declaration[];
    diff: number;
    size: number;
    fallbacks: Set<Declaration>;
} | null;
/**
 * @param {Container} rule
 * @param {{ cand: { decls: { prop: string, value: string }[], rank: number, mask: number, coveredCells: Set<number> }, repList: Declaration[], removable: Declaration[], diff: number, size: number, fallbacks: Set<Declaration> }} best
 * @param {Declaration[]} segment
 * @param {boolean} lane
 */
export declare function applyBestCandidate(rule: Container, best: {
    cand: {
        decls: {
            prop: string;
            value: string;
        }[];
        rank: number;
        mask: number;
        coveredCells: Set<number>;
    };
    repList: Declaration[];
    removable: Declaration[];
    diff: number;
    size: number;
    fallbacks: Set<Declaration>;
}, segment: Declaration[], lane: boolean): void;
//# sourceMappingURL=borderCandidates.d.ts.map