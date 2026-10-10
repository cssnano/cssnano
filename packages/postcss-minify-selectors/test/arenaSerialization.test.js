import assert from 'node:assert/strict';
import { test } from 'node:test';
import cssnanoUtils from 'cssnano-utils';
import { buildSelectorArena } from '../src/lib/arena.js';
import { normalizeArena } from '../src/lib/normalizeArena.js';
import { OutputPool } from '../src/lib/normalizePool.js';
import { parseSelectorArena } from '../src/lib/parseArena.js';
import { serializeNormalized } from '../src/lib/serializeArena.js';

const { tokens } = cssnanoUtils;

function nestedArena(source) {
  const tokenList = tokens(source);
  let compound = -1;
  let pseudo = -1;
  const arena = buildSelectorArena(source, tokenList, (builder) => {
    const list = builder.open('list', 0, tokenList.length, {
      payload: builder.payload('lists', { mode: 'outer-unforgiving' }),
    });
    const complex = builder.open('complex', 0, tokenList.length);
    compound = builder.open('compound', 0, tokenList.length);
    builder.leaf('class', 0, 2);
    pseudo = builder.open('pseudo', 2, tokenList.length, {
      payload: builder.payload('pseudos', {
        name: 'is',
        nameToken: 3,
        colonCount: 1,
        pseudoKind: 'class',
        specificityPolicy: 'maximum-argument',
        argumentGrammar: 'forgiving-selector-list',
      }),
    });
    const argument = builder.open('list', 4, tokenList.length - 1, {
      payload: builder.payload('lists', { mode: 'forgiving' }),
    });
    builder.leaf('complex', 4, tokenList.length - 1);
    builder.closeSummary(argument);
    builder.closeSummary(pseudo);
    builder.closeSummary(compound);
    builder.closeSummary(complex);
    builder.closeSummary(list);
  });
  return { arena, compound, pseudo, tokenList };
}

test('serializeNormalized splices a node reference between synthetic text', () => {
  const { arena } = nestedArena('.card:is(.active)');
  assert.equal(
    serializeNormalized(arena, {
      kind: 'sequence',
      items: [
        { kind: 'text', value: ':is(' },
        { kind: 'node', node: 3 },
        { kind: 'text', value: ')' },
      ],
    }),
    ':is(.card)'
  );
});

test('serializeNormalized slices a source emit by offsets', () => {
  const { arena } = nestedArena('.card:is(.active)');
  assert.equal(
    serializeNormalized(arena, { kind: 'source', start: 6, end: 9 }),
    'is('
  );
});

test('serializeNormalized returns the source when there is no output tree', () => {
  const { arena } = nestedArena('.card:is(.active)');
  assert.equal(serializeNormalized(arena, undefined), '.card:is(.active)');
});

test('serializeNormalized restores the hex escape terminator before a descendant combinator', () => {
  const arena = parseSelectorArena('.a\\61  .b', {});
  assert.equal(
    serializeNormalized(arena, {
      kind: 'sequence',
      items: [
        { kind: 'text', value: '.a\\61' },
        { kind: 'text', value: ' ' },
        { kind: 'text', value: '.b' },
      ],
    }),
    '.a\\61  .b'
  );
});

test('serializeNormalized completes at depth 12,000 without recursion', () => {
  const depth = 12_000;
  // Only text emits are serialized, so any small arena works.
  const arena = parseSelectorArena('.a', { verifyArena: false });
  /** @type {import('../src/lib/outputOverlay.js').Emit} */
  let emit = { kind: 'text', value: '.b' };
  for (let index = 0; index < depth; index++)
    emit = {
      kind: 'sequence',
      items: [
        { kind: 'text', value: ':is(' },
        emit,
        { kind: 'text', value: ')' },
      ],
    };
  assert.equal(
    serializeNormalized(arena, emit),
    `${':is('.repeat(depth)}.b${')'.repeat(depth)}`
  );
});

test('direct normalized serialization yields the expected minified selectors', () => {
  const deep = `${':is('.repeat(1_000)}.a${')'.repeat(1_000)}`;
  for (const [source, options, expected] of [
    // Already minimal: nothing to rewrite.
    ['.a', {}, '.a'],
    // Already sorted and minimal.
    ['.card:is(.active,.pending)', {}, '.card:is(.active,.pending)'],
    [
      '.alpha .x .y .z,.beta .x .y .z',
      { convertToIs: true },
      ':is(.alpha,.beta) .x .y .z',
    ],
    ['.b/*!keep*/,.a', {}, '.a,.b/*!keep*/'],
    // Already minimal: nesting depth alone changes nothing.
    [deep, {}, deep],
    // Unknown pseudo-class: left as written.
    [':future(.x)', {}, ':future(.x)'],
  ]) {
    const arena = parseSelectorArena(source, { verifyArena: false });
    const emit = normalizeArena(arena, options);
    assert.equal(serializeNormalized(arena, emit), expected, source);
  }
});

test('unchanged simple and nested selectors stay source-backed', () => {
  for (const source of [
    '.a',
    ':is(.a)',
    `${':is('.repeat(12_000)}.a${')'.repeat(12_000)}`,
  ]) {
    const arena = parseSelectorArena(source, { verifyArena: false });
    assert.equal(
      normalizeArena(arena, { sort: false, convertToIs: false }),
      undefined
    );
  }
});

test('a changed container materializes an unchanged child reference', () => {
  const arena = parseSelectorArena('*.a', { verifyArena: false });
  const emit = normalizeArena(arena, { sort: false, convertToIs: false });
  assert.notEqual(emit, undefined);
  assert.equal(serializeNormalized(arena, emit), '.a');
});

test('OutputPool sequence length counts the restored hex escape terminator', () => {
  const arena = parseSelectorArena('.a\\61  .x', {});
  const pool = new OutputPool(arena);
  const output = pool.sequence([
    pool.text('.a\\61'),
    pool.text(' '),
    pool.text('.x'),
  ]);
  assert.equal(
    output.length,
    serializeNormalized(arena, pool.emit(output)).length
  );
});

test('trusted arena spans reproduce the source byte for byte', () => {
  for (const source of [
    '.a,.b',
    'svg|a > [x=y i]:future(.x),|*',
    ':is(.a,#b):where(div)',
    '.a\\61  .x',
    ':nth-child(odd of .a,#b)',
  ])
    assert.equal(
      serializeNormalized(parseSelectorArena(source, { verifyArena: false }), {
        kind: 'node',
        node: 0,
      }),
      source,
      source
    );
});
