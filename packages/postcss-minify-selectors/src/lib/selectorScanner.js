import { normalizeArena } from './normalizeArena.js';
import { parseSelectorArena } from './parseArena.js';
import { serializeArena } from './serializeArena.js';

/**
 * @param {string} source
 * @param {boolean} [sort]
 * @param {boolean} [convertToIs]
 * @param {boolean} [keyframe]
 * @param {boolean} [hasDefaultNamespace]
 */
function normalizeList(
  source,
  sort = true,
  convertToIs = true,
  keyframe = false,
  hasDefaultNamespace = false
) {
  const arena = parseSelectorArena(source, {
    keyframe,
    hasDefaultNamespace,
  });
  return serializeArena(
    arena,
    normalizeArena(arena, {
      sort,
      convertToIs,
      keyframe,
      hasDefaultNamespace,
    })
  );
}

/** @param {string} source */
function specificityOf(source) {
  const arena = parseSelectorArena(source);
  return (arena.nodes[0].specificity ?? [0, 0, 0]).join(',');
}

export { normalizeList, specificityOf };
