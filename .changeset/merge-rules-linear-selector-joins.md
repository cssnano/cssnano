---
"cssnano": patch
---

fix(cssnano): mergeRules joins many rules with the same selector in linear time

Each rule joined into an earlier rule with the same selector made the earlier rule rebuild its property table and rescan its children, and made PostCSS scan the stylesheet to remove the joined rule. A stylesheet alternating two selectors took quadratic time: 10,000 rules took 15.9 s and now take 0.15 s. The output is unchanged.
