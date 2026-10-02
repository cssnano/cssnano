import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

const body = '0%{opacity:0}to{opacity:1}';
const keyframes = `@keyframes a{${body}}@keyframes b{${body}}`;
const counterStyles =
  '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}';

test(
  'should not remove a keyframes name that a custom property holds',
  processCSS(
    `${keyframes}:root{--n:a}div{animation:var(--n)}`,
    `@keyframes a{${body}}:root{--n:a}div{animation:var(--n)}`
  )
);

test(
  'should not remove a keyframes name that a custom property holds as a string',
  processCSS(
    `${keyframes}:root{--n:"a"}div{animation:var(--n)}`,
    `@keyframes a{${body}}:root{--n:"a"}div{animation:var(--n)}`
  )
);

test(
  'should not remove a keyframes name that a var() fallback holds',
  processCSS(
    `${keyframes}div{animation:1s var(--n,a)}`,
    `@keyframes a{${body}}div{animation:1s var(--n,a)}`
  )
);

test(
  'should not remove a keyframes name that a var() fallback holds as a string',
  processCSS(
    `${keyframes}div{animation:1s var(--n,"a")}`,
    `@keyframes a{${body}}div{animation:1s var(--n,"a")}`
  )
);

test(
  'should not remove a keyframes name that a custom property holds when a longhand uses var()',
  processCSS(
    `${keyframes}div{animation:a 1s;animation-name:var(--n)}:root{--n:a}`,
    `@keyframes a{${body}}div{animation:a 1s;animation-name:var(--n)}:root{--n:a}`
  )
);

test(
  'should not remove a counter style name that a custom property holds',
  processCSS(
    `${counterStyles}:root{--n:a}ul{list-style-type:var(--n)}`,
    `@counter-style a{system:cyclic;symbols:"A"}:root{--n:a}ul{list-style-type:var(--n)}`
  )
);

test(
  'should not remove a counter style name that a var() fallback holds',
  processCSS(
    `${counterStyles}ul{list-style-type:var(--n,a)}`,
    `@counter-style a{system:cyclic;symbols:"A"}ul{list-style-type:var(--n,a)}`
  )
);

test(
  'should not remove a keyframes name that an @property initial-value holds',
  processCSS(
    `@property --n{syntax:'<custom-ident>';inherits:false;initial-value:a}${keyframes}`,
    `@property --n{syntax:'<custom-ident>';inherits:false;initial-value:a}@keyframes a{${body}}`
  )
);

test(
  'should still rename to a name that a custom property holds',
  processCSS(
    `${keyframes}:root{--n:b}div{animation:a 1s}`,
    `@keyframes b{${body}}:root{--n:b}div{animation:b 1s}`
  )
);

test(
  'should protect a name referenced inside an unknown function',
  processCSS(
    `${keyframes}div{animation:a 1s steps(4,jump-start),b 1s foo(a)}`,
    `@keyframes a{${body}}div{animation:a 1s steps(4,jump-start),a 1s foo(a)}`
  )
);

test(
  'should not remove a keyframes name that an env() fallback holds',
  processCSS(
    `${keyframes}div{animation-name:env(--x,a)}`,
    `@keyframes a{${body}}div{animation-name:env(--x,a)}`
  )
);

test(
  'should not remove a keyframes name that an attr() fallback holds',
  processCSS(
    `${keyframes}div{animation-name:attr(data-a type(<custom-ident>),a)}`,
    `@keyframes a{${body}}div{animation-name:attr(data-a type(<custom-ident>),a)}`
  )
);

test(
  'should not remove a keyframes name that an if() branch holds',
  processCSS(
    `${keyframes}div{animation-name:if(media(width>1px):a;else:none)}`,
    `@keyframes a{${body}}div{animation-name:if(media(width>1px):a;else:none)}`
  )
);

test(
  'should not remove a keyframes name referenced in an @function result',
  processCSS(
    `@function --f(){result:a}${keyframes}div{animation-name:--f()}`,
    `@function --f(){result:a}@keyframes a{${body}}div{animation-name:--f()}`
  )
);

test(
  'should prefer the highest-priority protected name among multiple interchangeable names',
  processCSS(
    `@keyframes a{${body}}@keyframes b{${body}}@keyframes c{${body}}:root{--n:a;--m:b}div{animation:c 1s}`,
    `@keyframes a{${body}}@keyframes b{${body}}:root{--n:a;--m:b}div{animation:b 1s}`
  )
);

test(
  'should merge unprotected names into the single protected name in a three-name group',
  processCSS(
    `@keyframes a{${body}}@keyframes b{${body}}@keyframes c{${body}}:root{--n:a}div{animation:b 1s,c 1s}`,
    `@keyframes a{${body}}:root{--n:a}div{animation:a 1s,a 1s}`
  )
);

test('should skip the declaration protection scan when no definitions can merge', async () => {
  const root = postcss.parse(
    '@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:1}}div{color:red;font-size:12px;--n:a}'
  );
  let declWalks = 0;
  const origWalkDecls = root.walkDecls;
  root.walkDecls = function (...args) {
    declWalks++;
    return origWalkDecls.apply(this, args);
  };
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(declWalks, 0);
});

test('should walk declarations of the whole stylesheet once when renaming a reference', async () => {
  const root = postcss.parse(
    `${keyframes}div{animation:a 1s;color:red}@function --f(){result:a}`
  );
  let rootDeclWalks = 0;
  const origWalkDecls = root.walkDecls;
  root.walkDecls = function (...args) {
    rootDeclWalks++;
    return origWalkDecls.apply(this, args);
  };
  await postcss([plugin()]).process(root, { from: undefined });
  assert.equal(rootDeclWalks, 1);
});

test(
  'should protect names inside paren blocks',
  processCSS(
    `${keyframes}div{animation:1s (a)}`,
    `@keyframes a{${body}}div{animation:1s (a)}`
  )
);

test(
  'should merge a name that only appears in a bracket block',
  // `[a]` is invalid for animation-name, so no browser resolves it to a
  // keyframes rule and the definition it spells is free to merge.
  processCSS(
    `${keyframes}div{animation-name:[a]}`,
    `@keyframes b{${body}}div{animation-name:[a]}`
  )
);

test(
  'should not remove a keyframes name that an @function parameter default holds',
  processCSS(
    `@function --f(--n <custom-ident>: a){result:var(--n)}${keyframes}div{animation-name:--f()}`,
    `@function --f(--n <custom-ident>: a){result:var(--n)}@keyframes a{${body}}div{animation-name:--f()}`
  )
);

test(
  'should not turn a --x string keyframes name into a reference by the --x ident in animation',
  processCSS(
    `@keyframes "--x"{${body}}@keyframes b{${body}}div{animation:--x 1s}`,
    `@keyframes "--x"{${body}}@keyframes b{${body}}div{animation:--x 1s}`
  )
);

test(
  'should not turn a --x string keyframes name into a reference by the --x ident in animation-name',
  processCSS(
    `@keyframes "--x"{${body}}@keyframes b{${body}}div{animation-name:--x}`,
    `@keyframes "--x"{${body}}@keyframes b{${body}}div{animation-name:--x}`
  )
);

test(
  'should not remove a counter style name that counter() spells in a property without counter style references',
  processCSS(
    `${counterStyles}div{foo:counter(c,a)}`,
    `@counter-style a{system:cyclic;symbols:"A"}div{foo:counter(c,a)}`
  )
);

test(
  'should protect names inside curly blocks',
  processCSS(
    `${keyframes}:root{--n:{a}}`,
    `@keyframes a{${body}}:root{--n:{a}}`
  )
);

test(
  'should not remove a keyframes name that a @mixin parameter default holds',
  processCSS(
    `@mixin --m(--n: a){animation-name:var(--n)}${keyframes}div{animation-name:b}`,
    `@mixin --m(--n: a){animation-name:var(--n)}@keyframes a{${body}}div{animation-name:a}`
  )
);

test(
  'should not remove a keyframes name that an @apply argument holds',
  processCSS(
    `${keyframes}div{@apply --m(a);animation-name:b}`,
    `@keyframes a{${body}}div{@apply --m(a);animation-name:a}`
  )
);

test(
  'should not remove a keyframes name spelled with an escape inside a function',
  // The escape hides the name from a plain substring search of the value.
  processCSS(
    `${keyframes}div{animation-name:foo(\\61 )}`,
    `@keyframes a{${body}}div{animation-name:foo(\\61 )}`
  )
);

test(
  'should not remove a keyframes name that a custom property spells with a NUL',
  // CSS reads a NUL as U+FFFD, so a substring search of the value misses it.
  processCSS(
    `@keyframes \uFFFD{${body}}@keyframes b{${body}}:root{--n:\0}`,
    `@keyframes \uFFFD{${body}}:root{--n:\0}`
  )
);

test(
  'should not remove a keyframes name that a @container style query tests',
  // A style query compares a computed value, so the name it spells must survive.
  processCSS(
    `${keyframes}.z{animation:b}@container style(animation-name:a){.y{color:red}}`,
    `@keyframes a{${body}}.z{animation:a}@container style(animation-name:a){.y{color:red}}`
  )
);
