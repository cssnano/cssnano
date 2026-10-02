import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

const frames = '{0%{opacity:0}}';
const keyframesWithSpace = `@keyframes a\\ ${frames}@keyframes b${frames}`;
const keyframesWithTab = `@keyframes a\\\t${frames}@keyframes b${frames}`;

// PostCSS trims whitespace after a value, leaving a lone backslash in
// `decl.value`. The escaped code point survives in a raw of a neighbouring node.

test(
  'should rename a reference that ends in an escaped space at the end of a rule',
  processCSS(
    `${keyframesWithSpace}div{animation:a\\ }`,
    `@keyframes b${frames}div{animation:b }`
  )
);

test(
  'should rename a reference that ends in an escaped space before a semicolon',
  processCSS(
    `${keyframesWithSpace}div{animation:a\\ ;}`,
    `@keyframes b${frames}div{animation:b;}`
  )
);

test(
  'should rename a reference that ends in an escaped space before a following declaration',
  processCSS(
    `${keyframesWithSpace}div{animation:a\\ ;color:red}`,
    `@keyframes b${frames}div{animation:b;color:red}`
  )
);

test(
  'should rename a reference that ends in an escaped space before !important',
  processCSS(
    `${keyframesWithSpace}div{animation:a\\ !important}`,
    `@keyframes b${frames}div{animation:b !important}`
  )
);

test(
  'should rename a reference that ends in an escaped space before a comment',
  processCSS(
    `${keyframesWithSpace}div{animation:a\\ /*c*/}`,
    `@keyframes b${frames}div{animation:b /*c*/}`
  )
);

test(
  'should rename a reference that ends in an escaped tab at the end of a rule',
  processCSS(
    `${keyframesWithTab}div{animation:a\\\t}`,
    `@keyframes b${frames}div{animation:b\t}`
  )
);

test(
  'should rename a reference that ends in an escaped tab before a semicolon',
  processCSS(
    `${keyframesWithTab}div{animation:a\\\t;}`,
    `@keyframes b${frames}div{animation:b;}`
  )
);

test(
  'should rename a reference that ends in an escaped tab before !important',
  processCSS(
    `${keyframesWithTab}div{animation:a\\\t!important}`,
    `@keyframes b${frames}div{animation:b\t!important}`
  )
);

// A backslash before a newline is not an escape, so the reference spells `a`,
// not the merged name `a\ `. The @keyframes rule is still merged.
for (const [label, newline] of [
  ['a line feed', '\n'],
  ['a carriage return and line feed', '\r\n'],
  ['a form feed', '\f'],
]) {
  test(
    `should leave a reference that ends in a backslash before ${label} unchanged at the end of a rule`,
    processCSS(
      `${keyframesWithSpace}div{animation:a\\${newline}}`,
      `@keyframes b${frames}div{animation:a\\${newline}}`
    )
  );

  test(
    `should leave a reference that ends in a backslash before ${label} unchanged before a semicolon`,
    processCSS(
      `${keyframesWithSpace}div{animation:a\\${newline};}`,
      `@keyframes b${frames}div{animation:a\\${newline};}`
    )
  );
}

// The tokenizer reads a backslash at the end of input as U+FFFD, which would
// make this invalid declaration match a keyframes name that spells U+FFFD.
for (const [label, suffix] of [
  ['at the end of a rule', ''],
  ['before a semicolon', ';'],
]) {
  test(
    `should leave a reference that ends in a backslash before a newline unchanged when a name spells U+FFFD ${label}`,
    processCSS(
      `@keyframes a\\fffd ${frames}@keyframes b${frames}div{animation:a\\\n${suffix}}`,
      `@keyframes b${frames}div{animation:a\\\n${suffix}}`
    )
  );
}

test(
  'should keep the escaped tab of an unrenamed name when another name in the value is renamed',
  processCSS(
    `@keyframes x${frames}@keyframes y${frames}div{animation:x a\\\t;}`,
    `@keyframes y${frames}div{animation:y a\\\t;}`
  )
);

// The escaped space exists only in `raws.value.raw`, which the rewrite
// replaces, so dropping it would turn `a\ ` into an escaped semicolon.
test(
  'should keep the escaped space of an unrenamed name when another name in the value is renamed',
  processCSS(
    `@keyframes x${frames}@keyframes y${frames}div{animation:x a\\ ;}`,
    `@keyframes y${frames}div{animation:y a\\ ;}`
  )
);

// The restored space is kept next to the one the serializer writes, which is
// harmless after an ident.
test(
  'should keep the escaped space of an unrenamed name in a list when another name is renamed',
  processCSS(
    `@keyframes x${frames}@keyframes y${frames}div{animation-name:x, a\\ }`,
    `@keyframes y${frames}div{animation-name:y, a\\  }`
  )
);

test(
  'should not treat an even number of trailing backslashes as a dangling escape',
  processCSS(
    `@keyframes a\\\\${frames}@keyframes b${frames}div{animation:a\\\\ }`,
    `@keyframes b${frames}div{animation:b }`
  )
);

test(
  'should rewrite a reference to the name that ends in an escaped space',
  processCSS(
    `@keyframes abcd${frames}@keyframes c\\ ${frames}div{animation:abcd}`,
    `@keyframes c\\ ${frames}div{animation:c\\ }`
  )
);

test(
  'should rename an animation-name list entry that ends in an escaped space',
  processCSS(
    `${keyframesWithSpace}div{animation-name:x, a\\ }`,
    `@keyframes b${frames}div{animation-name:x, b }`
  )
);

test(
  'should rename a list-style-type that ends in an escaped space',
  processCSS(
    '@counter-style a\\ {system:cyclic;symbols:"*"}@counter-style b{system:cyclic;symbols:"*"}ul{list-style-type:a\\ }',
    '@counter-style b{system:cyclic;symbols:"*"}ul{list-style-type:b }'
  )
);

// The name `a\ ` in a @property initial-value is substituted text, which a
// rename of the @keyframes rule would not follow, so that name is kept.
test(
  'should keep the keyframes name that an @property initial-value spells with an escaped space',
  processCSS(
    `${keyframesWithSpace}@property --p{syntax:"*";inherits:false;initial-value:a\\ }div{animation:a\\ }`,
    `@keyframes a\\ ${frames}@property --p{syntax:"*";inherits:false;initial-value:a\\ }div{animation:a\\ }`
  )
);

// A comment next to whitespace is dropped from `decl.value` but kept in
// `raws.value.raw`, so the raw cannot be indexed by the length of the value.
test(
  'should keep the keyframes name that a declaration spells when a comment precedes a trailing backslash',
  processCSS(
    `${keyframesWithSpace}div{animation-name:x /**/ ,   a\\\n;}`,
    `@keyframes a\\ ${frames}div{animation-name:x /**/ ,   a\\\n;}`
  )
);

// An earlier plugin can leave `raws.value` stale; PostCSS then serializes the
// bare value followed by `;`, which the backslash escapes.
for (const [label, css, expected] of [
  [
    'a following declaration',
    `${keyframesWithSpace}div{animation:z\\ ;color:red}`,
    `@keyframes a\\ ${frames}div{animation:a\\;color:red}`,
  ],
  [
    'a trailing semicolon',
    `${keyframesWithSpace}div{animation:z\\ ;}`,
    `@keyframes a\\ ${frames}div{animation:a\\;}`,
  ],
]) {
  test(`should keep the keyframes name that a stale-raws declaration may spell before ${label}`, async (t) => {
    const staleRaws = {
      postcssPlugin: 'stale-raws',
      Declaration(decl) {
        if (decl.prop === 'animation') {
          decl.value = 'a\\';
        }
      },
    };
    const result = await postcss([staleRaws, plugin()]).process(css, {
      from: undefined,
    });
    t.assert.strictEqual(result.css, expected);
  });
}

test(
  'should keep the keyframes name that an @function body spells with an escaped space',
  processCSS(
    `${keyframesWithSpace}@function --f(){result:a\\ }div{animation:a\\ }`,
    `@keyframes a\\ ${frames}@function --f(){result:a\\ }div{animation:a\\ }`
  )
);

// PostCSS rejects an unclosed bracket, so an earlier plugin builds the value.
test('should keep the keyframes name that an unclosed function spells with an escaped space', async (t) => {
  const unclosedFunction = {
    postcssPlugin: 'unclosed-function',
    Declaration(decl) {
      if (decl.prop === 'animation') {
        decl.value = 'var(--u,a\\';
        decl.raws.value = { value: decl.value, raw: `${decl.value} ` };
      }
    },
  };
  const result = await postcss([unclosedFunction, plugin()]).process(
    `${keyframesWithSpace}div{animation:z}`,
    { from: undefined }
  );
  t.assert.strictEqual(
    result.css,
    `@keyframes a\\ ${frames}div{animation:var(--u,a\\ }`
  );
});

// A comment in the value makes `raws.value.raw` differ from `decl.value`, so
// the code point after the backslash is unknown. The declaration may still be
// valid, so the names it spells keep their definitions.
test(
  'should keep a renamed keyframes name that a declaration with a comment and an escaped space spells',
  processCSS(
    `@keyframes x${frames}@keyframes y${frames}div{animation-name:x /**/ , a\\ ;}`,
    `@keyframes x${frames}div{animation-name:x /**/ , a\\ ;}`
  )
);

test('should keep a renamed keyframes name when the code point after a trailing backslash is unknown', async (t) => {
  const builtWithoutRaws = {
    postcssPlugin: 'built-without-raws',
    Declaration(decl) {
      if (decl.prop === 'animation-name') {
        decl.value = 'x, a\\';
        delete decl.raws.value;
        delete decl.parent.raws.after;
        delete decl.parent.raws.semicolon;
      }
    },
  };
  const result = await postcss([builtWithoutRaws, plugin()]).process(
    `@keyframes x${frames}@keyframes y${frames}div{animation-name:z}`,
    { from: undefined }
  );
  t.assert.strictEqual(
    result.css,
    `@keyframes x${frames}div{animation-name:x, a\\}`
  );
});

// A var() keeps the declaration valid until substitution, so the backslash
// before the newline does not make it invalid and its names must follow.
test('should rename a reference before an unclosed var() that ends in a backslash and a newline', async (t) => {
  const unclosedVar = {
    postcssPlugin: 'unclosed-var',
    Declaration(decl) {
      if (decl.prop === 'animation') {
        decl.value = 'x var(--u, a\\';
        decl.raws.value = { value: decl.value, raw: `${decl.value}\n` };
      }
    },
  };
  const result = await postcss([unclosedVar, plugin()]).process(
    `@keyframes x${frames}@keyframes y${frames}div{animation:z}`,
    { from: undefined }
  );
  t.assert.strictEqual(
    result.css,
    `@keyframes y${frames}div{animation:y var(--u, a\\\n}`
  );
});

const counterStyleWithSpace =
  '@counter-style a\\ {system:cyclic;symbols:"*"}@counter-style b{system:cyclic;symbols:"*"}';

test(
  'should rename a @counter-style system that extends a name ending in an escaped space',
  processCSS(
    `${counterStyleWithSpace}@counter-style c{system:extends a\\ ;}`,
    '@counter-style b{system:cyclic;symbols:"*"}@counter-style c{system:extends b;}'
  )
);

test(
  'should rename a @counter-style fallback that ends in an escaped space',
  processCSS(
    `${counterStyleWithSpace}@counter-style c{system:cyclic;symbols:"+";fallback:a\\ }`,
    '@counter-style b{system:cyclic;symbols:"*"}@counter-style c{system:cyclic;symbols:"+";fallback:b }'
  )
);

// A backslash before a newline is not an escape, so substituted text spells
// `a` followed by a delim, and a rename of `a` would not follow it.
for (const [label, rule] of [
  [
    'an @property initial-value',
    '@property --p{syntax:"*";inherits:false;initial-value:a\\\n}',
  ],
  ['a custom property', 'div{--p:a\\\n}'],
  ['an @function body', '@function --f(){result:a\\\n}'],
]) {
  test(
    `should keep the keyframes name that ${label} spells before a backslash and a newline`,
    processCSS(
      `@keyframes b${frames}@keyframes abc${frames}${rule.replace('a\\', 'abc\\')}div{animation:b}`,
      `@keyframes abc${frames}${rule.replace('a\\', 'abc\\')}div{animation:abc}`
    )
  );
}

test(
  'should leave a reference that ends in a backslash before a lone carriage return unchanged',
  processCSS(
    `${keyframesWithSpace}div{animation:a\\\r}`,
    `@keyframes b${frames}div{animation:a\\\r}`
  )
);

test(
  'should rename a reference to a name that ends in a hex escape with its terminating space',
  processCSS(
    `@keyframes xyzw${frames}@keyframes \\61 ${frames}div{animation:xyzw}`,
    `@keyframes \\61 ${frames}div{animation:\\61 }`
  )
);
