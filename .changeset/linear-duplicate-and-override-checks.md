---
"cssnano": patch
---

perf(cssnano): discardDuplicates is now linear, and merge-rules checks override order in linear time per round

discardDuplicates compared each node with every earlier node of the same kind, so large inputs with many @media blocks or declarations took quadratic time. It now compares equality keys in constant time. merge-rules no longer compares every pair of declarations when it checks whether sharing would change the cascade, so rules with many repeated longhands are faster. The output is unchanged.
