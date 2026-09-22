import assert from 'node:assert/strict';
import { test } from 'node:test';
import cssnanoUtils from 'cssnano-utils';
import { buildSelectorArena } from '../src/lib/arena.js';
import { normalizeArena } from '../src/lib/normalizeArena.js';
import { parseSelectorArena } from '../src/lib/parseArena.js';
import {
  serializeArena,
  serializeEmit,
  serializeNormalized,
} from '../src/lib/serializeArena.js';

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

test('serialization weaves punctuation and gaps around changed children', () => {
  const { arena } = nestedArena('.card:is(.active)');
  assert.equal(
    serializeArena(arena, new Map([[6, { kind: 'text', value: '.on' }]])),
    '.card:is(.on)'
  );
});

test('Emit.node and synthetic sequences share the iterative serializer', () => {
  const { arena } = nestedArena('.card:is(.active)');
  assert.equal(
    serializeEmit(arena, new Map(), {
      kind: 'sequence',
      items: [
        { kind: 'text', value: ':is(' },
        { kind: 'node', node: 3 },
        { kind: 'text', value: ')' },
      ],
    }),
    ':is(.card)'
  );
  assert.equal(
    serializeEmit(arena, new Map(), {
      kind: 'source',
      start: 6,
      end: 9,
    }),
    'is('
  );
});

test('opaque parents suppress descendant rewrites', () => {
  const source = ':future(.old)';
  const tokenList = tokens(source);
  const arena = buildSelectorArena(source, tokenList, (builder) => {
    const list = builder.open('list', 0, tokenList.length, {
      payload: builder.payload('lists', { mode: 'outer-unforgiving' }),
    });
    const root = builder.open('pseudo', 0, tokenList.length, {
      status: 'opaque',
      payload: builder.payload('pseudos', {
        name: 'future',
        nameToken: 1,
        colonCount: 1,
        pseudoKind: 'class',
        specificityPolicy: 'normal',
        argumentGrammar: undefined,
      }),
    });
    builder.leaf('class', 2, tokenList.length - 1);
    builder.closeSummary(root);
    builder.closeSummary(list);
  });
  assert.equal(
    serializeArena(arena, new Map([[2, { kind: 'text', value: '.new' }]])),
    source
  );
});

test('serialization completes at depth 12,000 without recursion', () => {
  const depth = 12_000;
  const source = `${':is('.repeat(depth)}.a${')'.repeat(depth)}`;
  const tokenList = tokens(source);
  const arena = buildSelectorArena(source, tokenList, (builder) => {
    const list = builder.open('list', 0, tokenList.length, {
      payload: builder.payload('lists', { mode: 'outer-unforgiving' }),
    });
    const open = [];
    for (let index = 0; index < depth; index++)
      open.push(
        builder.open('pseudo', index * 2, tokenList.length - index, {
          payload: builder.payload('pseudos', {
            name: 'is',
            nameToken: index * 2,
            colonCount: 1,
            pseudoKind: 'class',
            specificityPolicy: 'maximum-argument',
            argumentGrammar: 'forgiving-selector-list',
          }),
        })
      );
    builder.leaf('class', depth * 2, depth * 2 + 2);
    while (open.length > 0) builder.closeSummary(open.pop());
    builder.closeSummary(list);
  });
  assert.equal(serializeArena(arena, new Map()), source);
  assert.equal(
    serializeArena(
      arena,
      new Map([[depth + 1, { kind: 'text', value: '.b' }]])
    ),
    `${':is('.repeat(depth)}.b${')'.repeat(depth)}`
  );
});

test('direct normalized serialization matches the general serializer', () => {
  const deep = `${':is('.repeat(1_000)}.a${')'.repeat(1_000)}`;
  for (const [source, options] of [
    ['.a', {}],
    ['.card:is(.active,.pending)', {}],
    ['.a x,.b x', { convertToIs: true }],
    ['.b/*!keep*/,.a', {}],
    [deep, {}],
    [':future(.x)', {}],
  ]) {
    const arena = parseSelectorArena(source, { verifyArena: false });
    const emit = normalizeArena(arena, options);
    assert.equal(
      serializeNormalized(arena, emit),
      emit === undefined ? source : serializeEmit(arena, new Map(), emit),
      source
    );
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
