---
"cssnano": patch
---

fix(cssnano): keep column longhands before an invalid two-term `columns` value

A `columns` value with two math widths, such as `calc(1px) calc(2px)`, or two math counts, such as `calc(2) 3`, is invalid, and browsers ignore it. cssnano treated it as valid and dropped the `column-width` and `column-count` longhands before it, so those longhands now stay. A two-term value with one math width and one math count, such as `calc(1px) 3`, is valid and still merges.
