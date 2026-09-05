import { normalizeParsedList } from './selectorScanner.js';

/** @typedef {import('./arena.js').SelectorArena} SelectorArena */
/** @typedef {import('./outputOverlay.js').Emit} Emit */

/**
 * Build a source overlay without mutating the parsed arena. The legacy
 * normalizer remains the byte-parity oracle while transformation families are
 * moved behind this boundary.
 *
 * @param {SelectorArena} arena
 * @param {{sort?:boolean,convertToIs?:boolean,keyframe?:boolean,hasDefaultNamespace?:boolean}} [options]
 * @return {Map<number, Emit>}
 */
export function normalizeArena(arena, options = {}) {
  if (!arena.structure) return new Map();
  const output = normalizeParsedList(
    arena.source,
    /** @type {Parameters<typeof normalizeParsedList>[1]} */ (arena.structure),
    options.sort,
    options.convertToIs,
    options.keyframe,
    options.hasDefaultNamespace
  );
  if (output === arena.source) return new Map();
  return new Map([[0, { kind: 'text', value: output }]]);
}
