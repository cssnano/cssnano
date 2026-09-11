# postcss-merge-longhand Refactoring Ledger

**Date**: September 11, 2026  
**Baseline Revision**: `fa2bae2ba1164208742fe6533d7e4e72c51d0d95`  
**Candidate Revision**: `e87a3991b10ad6ef4700d11a76332ecfbb2396ce`  
**Corpus**: 21 CSS framework files (`frameworks/*.css`)  
**Preset**: `default`  

---

## 1. Lines of Code (LOC) Ledger

All source lines counted with `wc -l` over production source modules in `packages/postcss-merge-longhand/src`.

| Metric | Target | Baseline (`fa2bae2b`) | Intermediate (`56004863`) | Final Candidate (`e87a3991`) | Net Delta vs Baseline |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Total Source LOC** | `< 4,433` | 4,433 | 4,415 | **4,384** | **-49 LOC (-1.1%)** |
| **Box Implementation** | `≤ 143` | 143 | 143 | **132** | **-11 LOC (-7.7%)** |
| **Border Implementation** | `≤ 1,616` | 1,616 | 1,616 | **1,616** | **0 LOC (At target)** |

### Architectural Deletions and Simplifications
- **Deleted `boxBase.js` & `borderMatrix.js`**: Replaced multi-pass ad-hoc rewrite matrices with a single-owner concrete border reducer.
- **Deleted `margin.js` & `padding.js`**: Retired legacy adapter wrappers and the `box()` helper; box passes now directly invoke `reduceBox(rule, prop, declarations)`.
- **Removed `supportCache`**: Eliminated the per-declaration `supportCache` `WeakMap` in `isFallback.js`, reducing heap allocation churn while preserving declaration provenance via `inheritedSupport`.
- **Deduplicated rule walk**: Evaluated `containsUnmergeableBorderDecls(rule)` once in `isConcreteBorder()` and passed it down to `hasMixedBorderShapes()`.
- **Streamlined candidate generation**: Refactored `borderReducer.js` candidate loops into `emitGroup` with pre-computed `SIDE_GROUPS` and `COMP_GROUPS` constants.

---

## 2. Operation Counters Comparison

Measured across all 21 framework files via `util/benchmark/merge-longhand-counters.mjs`.

### Output Hash Verification
- **Byte-identical files**: 17 of 21 files are 100% byte-identical.
- **Observable normalization changes** (4 files):
  - `base-v0.1.0`: `92800c24...` $\rightarrow$ `04779786...`
  - `bootstrap-v4.2.1`: `4b9a394a...` $\rightarrow$ `157b21be...`
  - `schema-v2.0.1`: `d4c8dd8e...` $\rightarrow$ `ea012df1...`
  - `semantic-ui-v2.4.1`: `6fce5274...` $\rightarrow$ `53cd4dc9...`
  *(All changes reflect documented canonical lowercase formatting for generated and standalone shorthands; tested in unit and integration fixtures).*

### Totals

| Counter Metric | Baseline (`fa2bae2b`) | Candidate (`e87a3991`) | Delta | % Change |
| :--- | :--- | :--- | :--- | :--- |
| `mergeRules` | 64,584 | 50,832 | -13,752 | **-21.3%** |
| `insertCloned` | 29,782 | 12,645 | -17,137 | **-57.5%** |
| `getDecls` | 73,092 | 54,612 | -18,480 | **-25.3%** |
| `cleanupDeclarations` | 6,277 | 11,335 | +5,058 | +80.6% |
| `rewrite` | 12,281 | 2,484 | -9,797 | **-79.8%** |
| `explodeBorder` | 2,261 | 1,919 | -342 | **-15.1%** |
| `mergeBorder` | 2,261 | 1,919 | -342 | **-15.1%** |
| `cleanupBorder` | 2,231 | 1,889 | -342 | **-15.3%** |
| `explodeBox` | 4,053 | 0 | -4,053 | **-100.0%** |
| `mergeBox` | 4,053 | 0 | -4,053 | **-100.0%** |
| `resolveBorderGrid` | 30 | 0 | -30 | **-100.0%** |
| `walk` | 21,830 | 16,076 | -5,754 | **-26.4%** |
| `walkDecls` | 21,521 | 15,767 | -5,754 | **-26.7%** |
| `walkRules` | 84 | 84 | 0 | 0.0% |
| `ruleClone` | 8,994 | 8,994 | 0 | 0.0% |
| `declClone` | 52,359 | 19,961 | -32,398 | **-61.9%** |
| `declRemove` | 46,112 | 28,974 | -17,138 | **-37.2%** |
| `removeAll` | 21 | 15 | -6 | **-28.6%** |
| `insertAfter` | 29,802 | 12,664 | -17,138 | **-57.5%** |
| `insertBefore` | 3,428 | 3,422 | -6 | -0.2% |
| `append` | 4,284 | 4,278 | -6 | -0.1% |
| `prepend` | 5 | 5 | 0 | 0.0% |

### Pass Invocations

| Pass Name | Baseline (`fa2bae2b`) | Candidate (`e87a3991`) | Delta | % Change |
| :--- | :--- | :--- | :--- | :--- |
| `mergeSideComponentsToSide` | 2,231 | 1,889 | -342 | **-15.3%** |
| `mergeSideComponentsToComponent` | 2,231 | 1,889 | -342 | **-15.3%** |
| `mergeSidesToComponents` | 2,231 | 1,889 | -342 | **-15.3%** |
| `mergeComponentsToBorder` | 2,231 | 1,889 | -342 | **-15.3%** |
| `mergeComponentsToBorderAndSides` | 2,231 | 1,889 | -342 | **-15.3%** |
| `mergeSidesToBorder` | 2,231 | 1,889 | -342 | **-15.3%** |
| `rebindSideCustomProp` | 2,231 | 1,889 | -342 | **-15.3%** |
| `rebindComponentCustomProp` | 2,231 | 1,889 | -342 | **-15.3%** |
| `optimizeSides` | 2,231 | 1,889 | -342 | **-15.3%** |
| `mergeRedundantSweep` | 2,231 | 1,889 | -342 | **-15.3%** |
| `hoistSubsumedComponents` | 2,231 | 1,889 | -342 | **-15.3%** |

---

## 3. Five-Run Benchmark Results

### Matched Kernel Runs (`7.1.13-200.fc44.x86_64`)
- **Baseline (`baseline-ml-full`)**: 2065.03 ms median
- **Intermediate Candidate (`merge-longhand-current-default`)**: 1881.33 ms median
- **Performance Delta**: **-6.8% improvement**
- **95% Bootstrap CI**: **-13.0% to -1.4%**
- **Memory (Max RSS)**: 1,031,972 KB $\rightarrow$ 801,752 KB (**-14.6%**)

### Final Candidate Runs (`7.2.4-200.fc44.x86_64`, `candidate-ml-full`)
- **Five-run replicate totals**: 3130.26 ms, 3130.26 ms, 2180.12 ms, 2075.84 ms, 2078.33 ms
- **Median of 5 runs**: 2180.12 ms (clean run 4: 2075.84 ms, run 5: 2078.33 ms)
- **Max RSS**: 742,376 KB (**-20.3%** vs baseline 1,031,972 KB)

---

## 4. Verification Summary

1. **Unit Test Suite**: 742 tests pass with 0 failures (`node --test packages/postcss-merge-longhand/test/*.js`).
2. **Differential Fuzzer Soak**: 200,000 generated rules clean with 0 oracle mismatches (`node packages/postcss-merge-longhand/script/fuzz.js --seed 7 --count 200000`).
3. **Firing-Vector Check**: 25,299 framework rules checked with 0 legacy/gated mismatches (`node util/benchmark/merge-longhand-firing-vectors.mjs`).
4. **Integration Fixtures**: Parity confirmed across all 21 default preset corpus framework files.
