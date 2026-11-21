import { test } from 'node:test';
import {
  processCSSFactory,
  presetEntryPlugin,
} from '../../../../util/testHelpers.js';
const plugin = presetEntryPlugin('discardUnused');

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should remove an unused font face when font-size uses var(), which cannot name a family',
  processCSS(
    '@font-face{font-family:Unused;src:url(a.woff)}a{font-family:Arial;font-size:var(--s)}',
    'a{font-family:Arial;font-size:var(--s)}'
  )
);

test(
  'should remove an unused font face when a custom property named --font-* uses var(), which is not a font declaration',
  processCSS(
    '@font-face{font-family:Unused;src:url(a.woff)}a{font-family:Arial;--font-x:var(--s)}',
    'a{font-family:Arial;--font-x:var(--s)}'
  )
);

test(
  'should remove an unused font face when font-weight uses var(), which cannot name a family',
  processCSS(
    '@font-face{font-family:Unused;src:url(a.woff)}a{font-family:Arial;font-weight:var(--w)}',
    'a{font-family:Arial;font-weight:var(--w)}'
  )
);

test(
  'should remove unused keyframes when animation-duration uses var(), which cannot name keyframes',
  processCSS(
    '@keyframes unused{0%{opacity:0}to{opacity:1}}a{animation-name:spin;animation-duration:var(--d)}',
    'a{animation-name:spin;animation-duration:var(--d)}'
  )
);

test(
  'should remove unused keyframes when animation-delay uses var(), which cannot name keyframes',
  processCSS(
    '@keyframes unused{0%{opacity:0}to{opacity:1}}a{animation-name:spin;animation-delay:var(--d)}',
    'a{animation-name:spin;animation-delay:var(--d)}'
  )
);

test(
  'should keep keyframes when a prefixed animation shorthand uses var(), which may name any of them',
  passthroughCSS(
    '@keyframes foo{0%{opacity:0}to{opacity:1}}a{-webkit-animation:var(--a) 1s}'
  )
);

test(
  'should keep a font face named by a star-hacked font-family',
  passthroughCSS(
    '@font-face{font-family:Hacky;src:url(a.woff)}a{*font-family:Hacky}'
  )
);

test(
  'should keep keyframes named by a star-hacked animation',
  passthroughCSS('@keyframes foo{0%{opacity:0}}a{*animation:foo 1s}')
);

test(
  'should keep keyframes named by an underscore-hacked animation-name',
  passthroughCSS('@keyframes foo{0%{opacity:0}}a{_animation-name:foo}')
);

test(
  'should keep a font face named by an uppercase FONT shorthand',
  passthroughCSS('@font-face{font-family:H;src:url(a.woff)}a{FONT:12px H}')
);

test(
  'should keep keyframes named by -webkit-animation-name',
  passthroughCSS('@keyframes foo{0%{opacity:0}}a{-webkit-animation-name:foo}')
);

test(
  'should keep a font face named by a font-family declared directly in a nested @media',
  passthroughCSS(
    '@font-face{font-family:H;src:url(a.woff)}a{@media (min-width:1px){font-family:H}}'
  )
);

test(
  'should keep a font face named by a font-family declared directly in @scope',
  passthroughCSS(
    '@font-face{font-family:H;src:url(a.woff)}@scope (.a){font-family:H}'
  )
);

test(
  'should keep a font face named by a font-family declared in @page',
  passthroughCSS(
    '@font-face{font-family:H;src:url(a.woff)}@page{font-family:H}'
  )
);

test(
  'should remove a font face named only by a $-hacked font-family, which only IE 7 reads',
  processCSS(
    '@font-face{font-family:Hacky;src:url(a.woff)}a{$font-family:Hacky}',
    'a{$font-family:Hacky}'
  )
);

test(
  'should remove a font face named only by a #-hacked font shorthand, which only IE 7 reads',
  processCSS(
    '@font-face{font-family:Hacky;src:url(a.woff)}a{#font:12px Hacky}',
    'a{#font:12px Hacky}'
  )
);

test(
  'should remove keyframes named only by a #-hacked animation, which only IE 7 reads',
  processCSS(
    '@keyframes foo{0%{opacity:0}}a{#animation:foo 1s}',
    'a{#animation:foo 1s}'
  )
);

test(
  'should remove keyframes named only by a .-hacked animation-name, which only IE 7 reads',
  processCSS(
    '@keyframes foo{0%{opacity:0}}a{.animation-name:foo}',
    'a{.animation-name:foo}'
  )
);

test(
  'should remove keyframes named only by a |-hacked prefixed animation, which only IE 7 reads',
  processCSS(
    '@keyframes foo{0%{opacity:0}}a{|-webkit-animation:foo 1s}',
    'a{|-webkit-animation:foo 1s}'
  )
);

test(
  'should remove an unused font face when a hacked font-size, which cannot name a family, is the only font declaration',
  processCSS(
    '@font-face{font-family:Unused;src:url(a.woff)}a{$font-size:var(--s)}',
    'a{$font-size:var(--s)}'
  )
);

test(
  'should keep a font face whose family is quoted in the face and unquoted in the rule',
  passthroughCSS(
    '@font-face{font-family:"Foo";src:url(a.woff)}a{font-family:Foo}'
  )
);

test(
  'should keep a font face whose family is unquoted in the face and quoted in the rule',
  passthroughCSS(
    '@font-face{font-family:Foo;src:url(a.woff)}a{font-family:"Foo"}'
  )
);

test(
  'should keep a font face whose multi-word family is spelled with extra spaces in the rule',
  passthroughCSS(
    '@font-face{font-family:Foo Bar;src:url(a.woff)}a{font-family:Foo   Bar}'
  )
);

test(
  'should keep a font face whose family is spelled with a CSS escape in the rule',
  passthroughCSS(
    '@font-face{font-family:Foo;src:url(a.woff)}a{font-family:\\46oo}'
  )
);

test(
  'should keep a font face whose family differs only in case',
  passthroughCSS(
    '@font-face{font-family:FOO;src:url(a.woff)}a{font-family:foo}'
  )
);

test(
  'should keep a font face whose multi-word family ends a font shorthand after style keywords',
  passthroughCSS(
    '@font-face{font-family:Foo Bar;src:url(a.woff)}a{font:italic bold 12px/1 Foo Bar,serif}'
  )
);

test(
  'should remove a font face when a used family only contains its name as a substring',
  processCSS(
    '@font-face{font-family:Foo;src:url(a.woff)}a{font-family:"Foo Bar"}',
    'a{font-family:"Foo Bar"}'
  )
);

test(
  'should keep a font face whose last font-family descriptor, the one browsers use, is in use',
  passthroughCSS(
    '@font-face{font-family:Foo;font-family:Bar;src:url(a.woff)}a{font-family:Bar}'
  )
);

test(
  'should keep a font face whose earlier font-family descriptor is used, since browsers fall back to it when the last is invalid',
  passthroughCSS(
    '@font-face{font-family:Foo;font-family:Bar;src:url(a.woff)}a{font-family:Foo}'
  )
);

test(
  'should keep a font face whose last font-family descriptor is a generic family, which a face cannot declare',
  passthroughCSS(
    '@font-face{font-family:Foo;font-family:serif;src:url(a.woff)}a{font-family:Foo}'
  )
);

test(
  'should remove a font face when none of its font-family descriptors is used',
  processCSS(
    '@font-face{font-family:Foo;font-family:Bar;src:url(a.woff)}a{font-family:Baz}',
    'a{font-family:Baz}'
  )
);

test(
  'should keep a font face whose family is a string followed by an identifier, which is not a family name',
  passthroughCSS(
    '@font-face{font-family:"Foo" Bar;src:url(a.woff)}a{font-family:Arial}'
  )
);
