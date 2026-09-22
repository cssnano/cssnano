# Selector Minifier Architecture

This package provides spec-compliant, high-performance CSS selector minification.
The public PostCSS plugin is exported from `src/index.js`; all modules under `src/lib/`
are internal implementation details and not package subpath exports.

## Pipeline Lifecycle

Selector processing proceeds through four decoupled phases:

```text
PostCSS Rule
  │
  ├─► 1. Fast-path classifier (bypass immutable ASCII selectors)
  │
  ├─► 2. Arena Parser (single-pass tokenizer spans -> flat immutable arena)
  │
  ├─► 3. Tree Normalizer (bottom-up traversal -> non-destructive output overlay)
  │       ├─ Micro-parsers (An+B, ident lists, pseudo arguments)
  │       ├─ List Deduplication & Ordering (structural ID + text hash)
  │       └─ Safe :is() Folding (deterministic priority worklist)
  │
  └─► 4. Output Serializer (unchanged source slices + changed output sequences)
```

1. **Fast-path classification**: Checks simple ASCII selectors against a narrow allowlist
   of spellings whose bytes normalization cannot alter. Matching rules bypass arena
   allocation and serialization entirely, preserving raw PostCSS metadata.
2. **Arena parsing**: Converts token spans into a flat, immutable preorder arena.
   Constructs segregated payload tables and records parse status, specificity, and
   semantic barrier facts.
3. **Tree normalization**: Bottom-up traversal produces a lightweight output overlay
   (`Normalized`) without mutating the underlying arena. Unchanged subtrees retain their
   arena node reference; transformed nodes receive synthesized emissions.
4. **Output serialization**: Combines unchanged source slices (using token offsets) with
   normalized output sequences without recursive AST traversals.

## Core Architectural Invariants

### 1. Preorder Arena and Payload Segregation
- **Contiguous layout**: All selector nodes (lists, complexes, compounds, combinators,
  simple selectors, pseudos) reside in a single flat array in preorder sequence. Each
  node records its start/end token boundaries and subtree range.
- **Segregated tables**: Specialized data (qualified names, pseudo arguments, attribute
  matchers) live in compact record arrays indexed by payload ID, keeping node records
  uniform in memory.
- **Immutability**: The arena is strictly read-only after construction. Normalization
  never modifies node kinds, token spans, or payload entries.

### 2. Status Partitioning and Fail-Closed Recovery
Every construct records an explicit semantic status:
- **`valid`**: Fully understood syntax conforming to standard CSS grammar.
- **`invalid`**: Explicitly malformed syntax according to applicable specifications.
- **`opaque`**: Potentially valid or forward-compatible syntax whose grammar is not
  modelled by the parser.

Recovery depends on context:
- **Style rules & unforgiving pseudos** (`:not()`, `:has()`, `:nth-child(... of S)`):
  Fail closed. Any invalid member invalidates the list, forcing source-backed fallback.
- **Forgiving selector lists** (`:is()`, `:where()`): Discard invalid members while
  preserving valid sibling entries.

### 3. Non-Destructive Output Overlays and Structural Interning
- **Overlay model**: Normalization returns an overlay structure referencing either the
  original arena node index or a newly emitted sequence.
- **Structural identity**: Normalization pools intern identical output fragments and
  primitive tokens into deterministic integer IDs. This allows constant-time structural
  comparisons before resorting to string serialization.

### 4. Trivia and Important Comment Lifecycle
- Ordinary comments are structural trivia and are collapsed or removed during normalization.
- Important comments (`/*! ... */`) are semantic trivia:
  - Preserved across selector list gaps (both leading and trailing relative to commas).
  - Preserved inside functional pseudo arguments (including `<an-plus-b>` formulas).
  - Kept intact during list deduplication and sorting.

### 5. Algorithmic Complexity Constraints
- **Linear scaling**: Transforms must scale linearly ($\mathcal{O}(N)$) across both wide
  lists (many sibling selectors) and deep trees (nested functional pseudos).
- **Single-pass trivia scanning**: Token gaps between sibling selectors are scanned in a
  single forward pass, cleanly partitioning leading and trailing trivia at the comma.
- **Tiered list deduplication**: Short lists ($N < 16$) deduplicate using structural
  integer IDs via a direct loop without string or Set allocations. Wide lists ($N \ge 16$)
  lazily transition to a Set of serialized text representations.
- **Active occurrence tracking**: Folding groups track occurrences using direct Sets with
  $\mathcal{O}(1)$ invalidation, avoiding scans over stale or deactivated occurrences.

## Safe Extension Contract

When adding or extending selector transformations:
1. **Never use regex for CSS token microsyntaxes**: Token boundaries, escapes, and
   delimiters must respect CSS Syntax 3 and Selectors 4 algorithms.
2. **Preserve token boundaries and short hex escapes**: Hex escapes require trailing
   whitespace when followed by hex digits (`\61 0` vs `\610`).
3. **Use grammar descriptors for functional pseudos**: Register the grammar family, delegate
   to an exact micro-parser, classify the payload in the parser, and emit output in the
   normalizer.
4. **Preserve keyframe semantics**: Keyframe selectors (`from`, `to`, percentages) use distinct
   grammar from style rules and must never be folded into `:is()`.
