'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const parser = require('postcss-selector-parser');
const tryFold = require('../src/lib/foldToIs.js');
const {
  tokenize,
  hasPseudoElementOrNesting,
  hasNthChildOfClause,
  hasUnsafeForFold,
  specificityOf,
  specificityOfMiddle,
  maxChildSpecificity,
  compareSpecificity,
  equalSpecificity,
} = require('../src/lib/foldToIsHelpers.js');

const parseSelector = (s) => parser().astSync(s).nodes[0];
const parseRoot = (s) => parser().astSync(s);
const nodesOf = (s) => parseSelector(s).nodes;
const compoundOf = (s) => ({ kind: 'compound', str: s, nodes: nodesOf(s) });

const parseRootNormalized = (s) => {
  const root = parser().astSync(s);
  root.walkCombinators((n) => {
    n.spaces.before = '';
    n.spaces.after = '';
    n.rawSpaceBefore = '';
    n.rawSpaceAfter = '';
    const v = n.value.trim();
    n.value = v.length ? v : ' ';
  });
  return root;
};

test('specificityOf: empty list is (0,0,0)', () => {
  assert.deepEqual(specificityOf([]), [0, 0, 0]);
});

test('specificityOf: tag is (0,0,1)', () => {
  assert.deepEqual(specificityOf(nodesOf('div')), [0, 0, 1]);
});

test('specificityOf: class is (0,1,0)', () => {
  assert.deepEqual(specificityOf(nodesOf('.foo')), [0, 1, 0]);
});

test('specificityOf: attribute is (0,1,0)', () => {
  assert.deepEqual(specificityOf(nodesOf('[data-x]')), [0, 1, 0]);
});

test('specificityOf: attribute with value is (0,1,0)', () => {
  assert.deepEqual(specificityOf(nodesOf('[role=combobox]')), [0, 1, 0]);
});

test('specificityOf: id is (1,0,0)', () => {
  assert.deepEqual(specificityOf(nodesOf('#foo')), [1, 0, 0]);
});

test('specificityOf: universal contributes 0', () => {
  assert.deepEqual(specificityOf(nodesOf('*')), [0, 0, 0]);
});

test('specificityOf: pseudo-class :hover is (0,1,0)', () => {
  assert.deepEqual(specificityOf(nodesOf(':hover')), [0, 1, 0]);
});

test('specificityOf: unknown pseudo-class falls back to class', () => {
  assert.deepEqual(specificityOf(nodesOf(':--custom')), [0, 1, 0]);
});

test('specificityOf: ::before is (0,0,1)', () => {
  assert.deepEqual(specificityOf(nodesOf('::before')), [0, 0, 1]);
});

test('specificityOf: ::after is (0,0,1)', () => {
  assert.deepEqual(specificityOf(nodesOf('::after')), [0, 0, 1]);
});

test('specificityOf: ::backdrop is (0,0,1)', () => {
  assert.deepEqual(specificityOf(nodesOf('::backdrop')), [0, 0, 1]);
});

test('specificityOf: legacy :before is (0,0,1)', () => {
  assert.deepEqual(specificityOf(nodesOf(':before')), [0, 0, 1]);
});

test('specificityOf: legacy :after is (0,0,1)', () => {
  assert.deepEqual(specificityOf(nodesOf(':after')), [0, 0, 1]);
});

test('specificityOf: legacy :first-letter is (0,0,1)', () => {
  assert.deepEqual(specificityOf(nodesOf(':first-letter')), [0, 0, 1]);
});

test('specificityOf: legacy :first-line is (0,0,1)', () => {
  assert.deepEqual(specificityOf(nodesOf(':first-line')), [0, 0, 1]);
});

test('specificityOf: :where() contributes 0', () => {
  assert.deepEqual(specificityOf(nodesOf(':where(#a, .b, c)')), [0, 0, 0]);
});

test('specificityOf: :is() takes max (class wins over tag)', () => {
  assert.deepEqual(specificityOf(nodesOf(':is(.a, b)')), [0, 1, 0]);
});

test('specificityOf: :is() takes max (id wins over class)', () => {
  assert.deepEqual(specificityOf(nodesOf(':is(.a, #x)')), [1, 0, 0]);
});

test('specificityOf: :is(tag) propagates type', () => {
  assert.deepEqual(specificityOf(nodesOf(':is(div)')), [0, 0, 1]);
});

test('specificityOf: :not(tag) propagates type', () => {
  assert.deepEqual(specificityOf(nodesOf(':not(div)')), [0, 0, 1]);
});

test('specificityOf: :has(tag) propagates type', () => {
  assert.deepEqual(specificityOf(nodesOf(':has(div)')), [0, 0, 1]);
});

test('specificityOf: :matches() (webkit alias) takes max', () => {
  assert.deepEqual(specificityOf(nodesOf(':matches(.a, #x)')), [1, 0, 0]);
});

test('specificityOf: :not() takes max', () => {
  assert.deepEqual(specificityOf(nodesOf(':not(.a, #x)')), [1, 0, 0]);
});

test('specificityOf: :has() takes max', () => {
  assert.deepEqual(specificityOf(nodesOf(':has(.a, #x)')), [1, 0, 0]);
});

test('specificityOf: nested :is(:not(#x)) recurses', () => {
  assert.deepEqual(specificityOf(nodesOf(':is(:not(#x))')), [1, 0, 0]);
});

test('specificityOf: :where wrapped in :is is still 0', () => {
  assert.deepEqual(specificityOf(nodesOf(':is(:where(#a, .b))')), [0, 0, 0]);
});

test('specificityOf: compound tag+class is (0,1,1)', () => {
  assert.deepEqual(specificityOf(nodesOf('div.foo')), [0, 1, 1]);
});

test('specificityOf: compound tag+attribute is (0,1,1)', () => {
  assert.deepEqual(specificityOf(nodesOf('button[role=combobox]')), [0, 1, 1]);
});

test('specificityOf: compound id+class+tag is (1,1,1)', () => {
  assert.deepEqual(specificityOf(nodesOf('div.foo#bar')), [1, 1, 1]);
});

test('specificityOf: many of each adds up', () => {
  assert.deepEqual(specificityOf(nodesOf('a.b.c[d][e]:hover')), [0, 5, 1]);
});

test('hasPseudoElementOrNesting: combinator is false', () => {
  assert.equal(
    hasPseudoElementOrNesting({ kind: 'combinator', str: '>' }),
    false
  );
});

test('hasPseudoElementOrNesting: tag is false', () => {
  assert.equal(hasPseudoElementOrNesting(compoundOf('div')), false);
});

test('hasPseudoElementOrNesting: class is false', () => {
  assert.equal(hasPseudoElementOrNesting(compoundOf('.foo')), false);
});

test('hasPseudoElementOrNesting: pseudo-class :hover is false', () => {
  assert.equal(hasPseudoElementOrNesting(compoundOf('a:hover')), false);
});

test('hasPseudoElementOrNesting: ::before is true', () => {
  assert.equal(hasPseudoElementOrNesting(compoundOf('a::before')), true);
});

test('hasPseudoElementOrNesting: ::after is true', () => {
  assert.equal(hasPseudoElementOrNesting(compoundOf('a::after')), true);
});

test('hasPseudoElementOrNesting: ::backdrop is true', () => {
  assert.equal(hasPseudoElementOrNesting(compoundOf('::backdrop')), true);
});

test('hasPseudoElementOrNesting: legacy :before is true', () => {
  assert.equal(hasPseudoElementOrNesting(compoundOf('a:before')), true);
});

test('hasPseudoElementOrNesting: legacy :after is true', () => {
  assert.equal(hasPseudoElementOrNesting(compoundOf('a:after')), true);
});

test('hasPseudoElementOrNesting: legacy :first-letter is true', () => {
  assert.equal(hasPseudoElementOrNesting(compoundOf('p:first-letter')), true);
});

test('hasPseudoElementOrNesting: legacy :first-line is true', () => {
  assert.equal(hasPseudoElementOrNesting(compoundOf('p:first-line')), true);
});

test('hasPseudoElementOrNesting: nesting & is true', () => {
  assert.equal(hasPseudoElementOrNesting(compoundOf('&')), true);
});

test('hasPseudoElementOrNesting: compound with & is true', () => {
  assert.equal(hasPseudoElementOrNesting(compoundOf('&.foo')), true);
});

test('hasNthChildOfClause: combinator is false', () => {
  assert.equal(hasNthChildOfClause({ kind: 'combinator', str: '>' }), false);
});

test('hasNthChildOfClause: plain compound is false', () => {
  assert.equal(hasNthChildOfClause(compoundOf('div.foo')), false);
});

test('hasNthChildOfClause: :nth-child(2n+1) without `of` is false', () => {
  assert.equal(hasNthChildOfClause(compoundOf(':nth-child(2n+1)')), false);
});

test('hasNthChildOfClause: :nth-child(odd) without `of` is false', () => {
  assert.equal(hasNthChildOfClause(compoundOf(':nth-child(odd)')), false);
});

test('hasNthChildOfClause: :nth-child(2n of .a) is true', () => {
  assert.equal(hasNthChildOfClause(compoundOf(':nth-child(2n of .a)')), true);
});

test('hasNthChildOfClause: :nth-child(odd of div) is true', () => {
  assert.equal(hasNthChildOfClause(compoundOf(':nth-child(odd of div)')), true);
});

test('hasNthChildOfClause: :nth-last-child(2n of .a) is true', () => {
  assert.equal(
    hasNthChildOfClause(compoundOf(':nth-last-child(2n of .a)')),
    true
  );
});

test('hasNthChildOfClause: :nth-of-type(2n) is false', () => {
  assert.equal(hasNthChildOfClause(compoundOf(':nth-of-type(2n)')), false);
});

test('hasNthChildOfClause: :hover is false', () => {
  assert.equal(hasNthChildOfClause(compoundOf(':hover')), false);
});

test('hasNthChildOfClause: tag named `of` outside :nth-child is false', () => {
  assert.equal(hasNthChildOfClause(compoundOf(':is(of)')), false);
});

test('hasNthChildOfClause: nested inside :is is true', () => {
  assert.equal(
    hasNthChildOfClause(compoundOf(':is(:nth-child(2n of .a))')),
    true
  );
});

test('hasNthChildOfClause: nested inside :not is true', () => {
  assert.equal(
    hasNthChildOfClause(compoundOf(':not(:nth-child(2n of .a))')),
    true
  );
});

test('hasNthChildOfClause: nested inside :has is true', () => {
  assert.equal(
    hasNthChildOfClause(compoundOf(':has(:nth-child(2n of .a))')),
    true
  );
});

test('hasNthChildOfClause: deeply nested is true', () => {
  assert.equal(
    hasNthChildOfClause(compoundOf(':is(:not(:nth-child(2n of .a)))')),
    true
  );
});

test('hasUnsafeForFold: combinator is false', () => {
  assert.equal(hasUnsafeForFold({ kind: 'combinator', str: '>' }), false);
});

test('hasUnsafeForFold: plain class is false', () => {
  assert.equal(hasUnsafeForFold(compoundOf('.foo')), false);
});

test('hasUnsafeForFold: plain id is false', () => {
  assert.equal(hasUnsafeForFold(compoundOf('#foo')), false);
});

test('hasUnsafeForFold: plain tag is false', () => {
  assert.equal(hasUnsafeForFold(compoundOf('div')), false);
});

test('hasUnsafeForFold: simple attribute is false', () => {
  assert.equal(hasUnsafeForFold(compoundOf('[type=text]')), false);
});

test('hasUnsafeForFold: allowlisted user-action pseudo is false', () => {
  assert.equal(hasUnsafeForFold(compoundOf(':hover')), false);
});

test('hasUnsafeForFold: tag.class:hover compound is false', () => {
  assert.equal(hasUnsafeForFold(compoundOf('div.foo:hover')), false);
});

test('hasUnsafeForFold: namespaced tag is true', () => {
  assert.equal(hasUnsafeForFold(compoundOf('svg|path')), true);
});

test('hasUnsafeForFold: namespaced attribute is true', () => {
  assert.equal(hasUnsafeForFold(compoundOf('[xlink|href]')), true);
});

test('hasUnsafeForFold: attribute with i flag is true', () => {
  assert.equal(hasUnsafeForFold(compoundOf('[t=a i]')), true);
});

test('hasUnsafeForFold: attribute with s flag is true', () => {
  assert.equal(hasUnsafeForFold(compoundOf('[t=a s]')), true);
});

test('hasUnsafeForFold: universal selector is true', () => {
  assert.equal(hasUnsafeForFold(compoundOf('*')), true);
});

test('hasUnsafeForFold: nesting selector is true', () => {
  assert.equal(hasUnsafeForFold(compoundOf('&')), true);
});

test('hasUnsafeForFold: pseudo-element is true', () => {
  assert.equal(hasUnsafeForFold(compoundOf('::before')), true);
});

test('hasUnsafeForFold: legacy single-colon pseudo-element is true', () => {
  assert.equal(hasUnsafeForFold(compoundOf(':before')), true);
});

test('hasUnsafeForFold: pseudo-class outside allowlist is true', () => {
  assert.equal(hasUnsafeForFold(compoundOf(':first-child')), true);
});

test('hasUnsafeForFold: functional pseudo with args is true', () => {
  assert.equal(hasUnsafeForFold(compoundOf(':not(.a)')), true);
});

test('hasUnsafeForFold: unknown pseudo is true', () => {
  assert.equal(hasUnsafeForFold(compoundOf(':--state')), true);
});

test('tokenize: single compound', () => {
  const t = tokenize(parseSelector('div.foo'));
  assert.equal(t.length, 1);
  assert.equal(t[0].kind, 'compound');
  assert.equal(t[0].str, 'div.foo');
});

test('tokenize: descendant combinator', () => {
  const t = tokenize(parseSelector('.a .b'));
  assert.deepEqual(
    t.map((x) => [x.kind, x.str]),
    [
      ['compound', '.a'],
      ['combinator', ' '],
      ['compound', '.b'],
    ]
  );
});

test('tokenize: child combinator', () => {
  const t = tokenize(parseSelector('.a > .b'));
  assert.equal(t.length, 3);
  assert.equal(t[0].kind, 'compound');
  assert.equal(t[0].str, '.a');
  assert.equal(t[1].kind, 'combinator');
  assert.match(t[1].str, />/);
  assert.equal(t[2].kind, 'compound');
  assert.equal(t[2].str, '.b');
});

test('tokenize: multiple combinators', () => {
  const t = tokenize(parseSelector('.a > .b + .c ~ .d'));
  assert.equal(t.length, 7);
  assert.equal(t[0].str, '.a');
  assert.equal(t[2].str, '.b');
  assert.equal(t[4].str, '.c');
  assert.equal(t[6].str, '.d');
});

test('tokenize: empty selector returns empty list', () => {
  const empty = parser.selector({ value: '' });
  assert.deepEqual(tokenize(empty), []);
});

test('specificityOfMiddle: sums compound specificities', () => {
  const middle = tokenize(parseSelector('.a div.foo'));
  assert.deepEqual(specificityOfMiddle(middle), [0, 2, 1]);
});

test('specificityOfMiddle: combinators contribute 0', () => {
  const middle = tokenize(parseSelector('.a > .b + .c'));
  assert.deepEqual(specificityOfMiddle(middle), [0, 3, 0]);
});

test('specificityOfMiddle: id contributes', () => {
  const middle = tokenize(parseSelector('#x .y'));
  assert.deepEqual(specificityOfMiddle(middle), [1, 1, 0]);
});

test('specificityOfMiddle: type contributes', () => {
  const middle = tokenize(parseSelector('div > span'));
  assert.deepEqual(specificityOfMiddle(middle), [0, 0, 2]);
});

test('compareSpecificity: id outranks classes', () => {
  assert.equal(compareSpecificity([1, 0, 0], [0, 99, 99]) > 0, true);
});

test('compareSpecificity: classes outrank types', () => {
  assert.equal(compareSpecificity([0, 1, 0], [0, 0, 99]) > 0, true);
});

test('compareSpecificity: equal returns 0', () => {
  assert.equal(compareSpecificity([1, 2, 3], [1, 2, 3]), 0);
});

test('compareSpecificity: type tiebreak', () => {
  assert.equal(compareSpecificity([0, 0, 2], [0, 0, 1]) > 0, true);
});

test('equalSpecificity: identical is true', () => {
  assert.equal(equalSpecificity([1, 2, 3], [1, 2, 3]), true);
});

test('equalSpecificity: differ in id is false', () => {
  assert.equal(equalSpecificity([1, 0, 0], [0, 0, 0]), false);
});

test('equalSpecificity: differ in class is false', () => {
  assert.equal(equalSpecificity([0, 1, 0], [0, 0, 0]), false);
});

test('equalSpecificity: differ in type is false', () => {
  assert.equal(equalSpecificity([0, 0, 1], [0, 0, 0]), false);
});

test('maxChildSpecificity: picks largest child', () => {
  const pseudo = parseRoot(':is(.a, #x, b)').nodes[0].nodes[0];
  assert.deepEqual(maxChildSpecificity(pseudo), [1, 0, 0]);
});

test('maxChildSpecificity: empty pseudo returns (0,0,0)', () => {
  const pseudo = parseRoot(':is()').nodes[0].nodes[0];
  assert.deepEqual(maxChildSpecificity(pseudo), [0, 0, 0]);
});

test('fold: shared prefix with multiple selectors', () => {
  assert.equal(
    tryFold(parseRoot('.x .a,.x .b,.x .c,.x .d')),
    '.x :is(.a,.b,.c,.d)'
  );
});

test('fold: shared suffix with multiple selectors', () => {
  assert.equal(
    tryFold(parseRoot('section h1,article h1,aside h1,nav h1')),
    ':is(section,article,aside,nav) h1'
  );
});

test('fold: shared prefix and suffix', () => {
  assert.equal(
    tryFold(
      parseRoot('.nav .a .item,.nav .b .item,.nav .c .item,.nav .d .item')
    ),
    '.nav :is(.a,.b,.c,.d) .item'
  );
});

test('fold: dedupes identical middles', () => {
  assert.equal(
    tryFold(parseRoot('.x .a .y,.x .a .y,.x .b .y,.x .c .y')),
    '.x :is(.a,.b,.c) .y'
  );
});

test('no-fold: :where() in middle (functional pseudo outside allowlist)', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x :where(.a) .y,.x :where(.b) .y,.x :where(.c) .y,.x :where(.d) .y'
      )
    ),
    null
  );
});

test('no-fold: :not(.a &) in middle (functional pseudo with nesting inside)', () => {
  assert.equal(
    tryFold(
      parseRoot('.x :not(.a &) y,.x :not(.b &) y,.x :not(.c &) y,.x :not(.d &) y')
    ),
    null
  );
});

test('no-fold: :is(::before) in middle (functional pseudo outside allowlist)', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x :is(::before) y,.x :is(::after) y,' +
          '.x :is(::backdrop) y,.x :is(::marker) y'
      )
    ),
    null
  );
});

test('fold: universal in shared prefix', () => {
  assert.equal(tryFold(parseRoot('* a,* b,* c,* d')), '* :is(a,b,c,d)');
});

test('fold: universal in shared suffix', () => {
  assert.equal(
    tryFold(parseRoot('.a *,.b *,.c *,.d *')),
    ':is(.a,.b,.c,.d) *'
  );
});

test('fold: leading combinator (nesting context)', () => {
  assert.equal(
    tryFold(parseRootNormalized('> .a,> .b,> .c,> .d,> .e,> .f,> .g,> .h')),
    '>:is(.a,.b,.c,.d,.e,.f,.g,.h)'
  );
});

test('fold: trailing combinator (nesting context)', () => {
  assert.equal(
    tryFold(parseRootNormalized('.a >,.b >,.c >,.d >,.e >,.f >,.g >,.h >')),
    ':is(.a,.b,.c,.d,.e,.f,.g,.h)>'
  );
});

test('no-fold: case-insensitive attribute (i flag) in middle', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x [type="text" i],.x [type="email" i],' +
          '.x [type="search" i],.x [type="url" i]'
      )
    ),
    null
  );
});

test('no-fold: namespaced attribute in middle', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x [xlink|href],.x [xlink|title],.x [xlink|role],.x [xlink|type]'
      )
    ),
    null
  );
});

test('no-fold: custom-property pseudo-classes in middle', () => {
  assert.equal(
    tryFold(parseRoot('.x :--open,.x :--closed,.x :--hover,.x :--focus')),
    null
  );
});

test('no-fold: namespaced wildcard tag middles (svg|a etc.)', () => {
  assert.equal(
    tryFold(parseRoot('.x svg|a,.x svg|b,.x svg|c,.x svg|d')),
    null
  );
});

test('no-fold: :nth-child(2n+1) in middle (structural pseudo outside allowlist)', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x :nth-child(1) y,.x :nth-child(2) y,' +
          '.x :nth-child(3) y,.x :nth-child(4) y'
      )
    ),
    null
  );
});

test('no-fold: single selector', () => {
  assert.equal(tryFold(parseRoot('.a .b')), null);
});

test('no-fold: no shared prefix or suffix', () => {
  assert.equal(tryFold(parseRoot('.a, .b')), null);
});

test('no-fold: result not strictly shorter', () => {
  assert.equal(tryFold(parseRoot('.x .a,.x .b')), null);
});

test('no-fold: mixed-specificity middles', () => {
  assert.equal(
    tryFold(
      parseRoot('.x input,.x button[role=combobox],.x select,.x textarea')
    ),
    null
  );
});

test('no-fold: all middles identical (after dedup < 2)', () => {
  assert.equal(tryFold(parseRoot('.x .a .y,.x .a .y')), null);
});

test('no-fold: pseudo-element ::before in middle', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x ::before .y,.x ::after .y,.x ::backdrop .y,.x ::marker .y'
      )
    ),
    null
  );
});

test('no-fold: nesting `&` in middle', () => {
  assert.equal(
    tryFold(parseRoot('.x & .y,.x .a .y,.x .b .y,.x .c .y')),
    null
  );
});

test('no-fold: prefix would split a compound', () => {
  assert.equal(tryFold(parseRoot('.a.b,.a.c')), null);
});

test('no-fold: suffix would split a compound', () => {
  assert.equal(tryFold(parseRoot('.b.a,.c.a')), null);
});

test('no-fold: :is(.a) vs :is(#x) middles differ in specificity', () => {
  assert.equal(
    tryFold(
      parseRoot('.x :is(.a) .y,.x :is(#z) .y,.x :is(.b) .y,.x :is(.c) .y')
    ),
    null
  );
});

test('no-fold: :nth-child(... of S) even when middles match', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x :nth-child(2n of #a) y,.x :nth-child(2n of #b) y,' +
          '.x :nth-child(2n of #c) y,.x :nth-child(2n of #d) y'
      )
    ),
    null
  );
});

test('no-fold: :nth-child(... of S) with mixed-specificity inner selector', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x :nth-child(2n of #a) y,.x :nth-child(2n of .b) y,' +
          '.x :nth-child(2n of .c) y,.x :nth-child(2n of .d) y'
      )
    ),
    null
  );
});

test('no-fold: :nth-last-child(... of S)', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x :nth-last-child(2n of .a) y,.x :nth-last-child(2n of .b) y,' +
          '.x :nth-last-child(2n of .c) y,.x :nth-last-child(2n of .d) y'
      )
    ),
    null
  );
});

test('no-fold: Vue :deep() middles (issue #1784)', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.field-input.field-input-default :deep(input),' +
          '.field-input.field-input-default :deep(button[role="combobox"]),' +
          '.field-input.field-input-default :deep(textarea),' +
          '.field-input.field-input-default :deep(select)'
      )
    ),
    null
  );
});

test('no-fold: CSS Modules :global() middles', () => {
  assert.equal(
    tryFold(
      parseRoot('.x :global(.a),.x :global(.b),.x :global(.c),.x :global(.d)')
    ),
    null
  );
});

test('no-fold: shadow-DOM :slotted() middles', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x :slotted(a),.x :slotted(b),.x :slotted(c),.x :slotted(d)'
      )
    ),
    null
  );
});

test('no-fold: :host() middles', () => {
  assert.equal(
    tryFold(parseRoot(':host(.a) y,:host(.b) y,:host(.c) y,:host(.d) y')),
    null
  );
});

test('no-fold: :host-context() middles', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x :host-context(.a) y,.x :host-context(.b) y,' +
          '.x :host-context(.c) y,.x :host-context(.d) y'
      )
    ),
    null
  );
});

test('no-fold: ::part(name) middles', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x ::part(a) y,.x ::part(b) y,.x ::part(c) y,.x ::part(d) y'
      )
    ),
    null
  );
});

test('no-fold: custom-property pseudo with args :--state(.a)', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x :--state(.a),.x :--state(.b),.x :--state(.c),.x :--state(.d)'
      )
    ),
    null
  );
});

test('no-fold: :nth-child(... of S) nested inside :is', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x :is(:nth-child(2n of #a)) y,.x :is(:nth-child(2n of .b)) y,' +
          '.x :is(:nth-child(2n of .c)) y,.x :is(:nth-child(2n of .d)) y'
      )
    ),
    null
  );
});

test('no-fold: :nth-child(... of S) nested inside :not', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x :not(:nth-child(2n of #a)) y,.x :not(:nth-child(2n of .b)) y,' +
          '.x :not(:nth-child(2n of .c)) y,.x :not(:nth-child(2n of .d)) y'
      )
    ),
    null
  );
});

test('no-fold: :deep() nested inside :is', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x :is(:deep(.a)) y,.x :is(:deep(.b)) y,' +
          '.x :is(:deep(.c)) y,.x :is(:deep(.d)) y'
      )
    ),
    null
  );
});

test('no-fold: :deep() nested inside :has', () => {
  assert.equal(
    tryFold(
      parseRoot(
        '.x :has(:deep(.a)) y,.x :has(:deep(.b)) y,' +
          '.x :has(:deep(.c)) y,.x :has(:deep(.d)) y'
      )
    ),
    null
  );
});
