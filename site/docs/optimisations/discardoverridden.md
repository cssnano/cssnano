---
title: "discardOverridden"
layout: Optimisation
identifier: discardoverridden
---

<!-- This file was automatically generated. -->


Removes at-rules which have the same identifier as another; for example two
instances of `@keyframes one`. As the browser will only count the *last* of
these declarations, all others can safely be removed.
