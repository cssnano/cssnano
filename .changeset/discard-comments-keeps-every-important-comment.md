---
"cssnano": major
---

feat(cssnano)!: discardComments no longer has a `removeAllButFirst` option, so every comment marked as important (`/*!`) is kept unless `removeAll` or `remove` asks for it

Important comments often carry license notices, which a bundle must keep for each library it includes. A configuration that still passes `removeAllButFirst` now keeps every important comment.
