---
"postcss-merge-longhand": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
---

fix(postcss-merge-longhand): leave a border declaration the browser drops alone

A border declaration whose value is not what the property takes — `border` and
its per-side shorthands want a `<line-width>`, a `<line-style>` and a `<color>`,
each stated at most once, and the properties naming one component want that
component — is invalid, and the browser drops it whole. The plugin read every
one of them as a declaration that applies, and merged the rest of the rule
against a border no side ever has.

```css
a {
  border: solid red red;
  border-left: solid;
  border-color: grey;
  border-width: 2px;
}
```

`border: solid red red` states the colour twice, so nothing in that rule sets a
top, right or bottom border. It was minified to `a{border:2px solid grey}`,
which gives all four sides one. The rule now passes through.

The same reading was behind:

- `border: solid red red` on its own becoming `border: solid red`, and
  `border: 1px 1px` becoming `border: 1px`, turning a declaration the browser
  drops into one that paints
- `border-color: red; border: 1px solid 50%` losing the `border-color`, which is
  the only declaration of the two that survives
- `border-top-color: 50%` next to a width and a style becoming
  `border-top: 1px solid 50%`, where one dropped longhand costs the side its
  border entirely
- one bad side colour spreading over the other three, as
  `border-top-color: 50%` beside three `red` sides merged into
  `border-color: 50% red red`, a declaration no side keeps

A rule holding such a declaration is now left as it stands. `border-color: none`
— which stylesheets write beside `border-style: none`, and which is no colour —
is left alone as well, rather than rewritten to `border-color: currentcolor`,
which is not the same declaration when an earlier rule sets a border colour.
