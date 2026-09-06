import { test } from 'node:test';
import assert from 'node:assert/strict';
import cssnanoUtils from 'cssnano-utils';
import {
  addSemanticFact,
  addSpecificity,
  buildSelectorArena,
  createSemanticFacts,
  hasSemanticFact,
  isFoldEligible,
  semanticFacts,
} from '../src/lib/arena.js';
import {
  serializeArena,
  serializeEmit,
  serializeNormalized,
} from '../src/lib/serializeArena.js';
import { parseSelectorArena } from '../src/lib/parseArena.js';
import { normalizeArena } from '../src/lib/normalizeArena.js';

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

test('completed arenas use exclusive spans and immutable preorder nodes', () => {
  const { arena, compound, pseudo, tokenList } =
    nestedArena('.card:is(.active)');
  assert.equal(arena.nodes[0].endToken, tokenList.length);
  assert.equal(arena.nodes[compound].subtreeEnd, 7);
  assert.equal(arena.nodes[pseudo].subtreeEnd, 7);
  assert.equal(arena.payloads.lists[0].mode, 'outer-unforgiving');
  assert.throws(() => {
    arena.nodes[compound].status = 'opaque';
  }, TypeError);
  assert.throws(() => arena.nodes.push(arena.nodes[0]), TypeError);
});

test('empty list spans are valid and serialize exactly', () => {
  const arena = buildSelectorArena('', [], (builder) => {
    const root = builder.open('list', 0, 0, {
      payload: builder.payload('lists', { mode: 'forgiving' }),
    });
    builder.closeSummary(root);
  });
  assert.equal(serializeArena(arena, new Map()), '');
});

test('arena validates bounds and close order', () => {
  const tokenList = tokens('.a');
  assert.throws(
    () =>
      buildSelectorArena('.a', tokenList, (builder) => {
        builder.open('list', 0, tokenList.length + 1);
      }),
    /exclusive token span/
  );
  assert.throws(
    () =>
      buildSelectorArena('.a', tokenList, (builder) => {
        const root = builder.open('list', 0, tokenList.length);
        builder.open('complex', 0, tokenList.length);
        builder.closeSummary(root);
      }),
    /stack order/
  );
});

test('fold eligibility includes function and unsafe-pseudo barriers', () => {
  const safe = createSemanticFacts();
  const eligible = { kind: 'compound', status: 'valid', facts: safe };
  assert.equal(isFoldEligible(eligible), true);
  assert.equal(
    isFoldEligible({
      ...eligible,
      facts: addSemanticFact(safe, semanticFacts.function),
    }),
    false
  );
  assert.equal(
    isFoldEligible({
      ...eligible,
      facts: addSemanticFact(safe, semanticFacts.unsafePseudo),
    }),
    false
  );
});

test('checked specificity addition reports overflow as opaque', () => {
  assert.deepEqual(addSpecificity([0, 256, 0], [1, 0, 0]), {
    status: 'valid',
    specificity: [1, 256, 0],
  });
  assert.deepEqual(
    addSpecificity([Number.MAX_SAFE_INTEGER - 10, 5, 0], [10, 0, 1]),
    {
      status: 'valid',
      specificity: [Number.MAX_SAFE_INTEGER, 5, 1],
    }
  );
  assert.deepEqual(addSpecificity([Number.MAX_SAFE_INTEGER, 0, 0], [1, 0, 0]), {
    status: 'opaque',
  });
});

test('close-time specificity overflow makes the affected construct opaque', () => {
  const tokenList = tokens('.a');
  const arena = buildSelectorArena('.a', tokenList, (builder) => {
    const root = builder.open('list', 0, tokenList.length, {
      payload: builder.payload('lists', { mode: 'outer-unforgiving' }),
    });
    const complex = builder.open('complex', 0, tokenList.length);
    builder.leaf('class', 0, tokenList.length);
    builder.closeSummary(complex, {
      ...addSpecificity([Number.MAX_SAFE_INTEGER, 0, 0], [1, 0, 0]),
      facts: createSemanticFacts(),
    });
    builder.closeSummary(root, {
      status: 'valid',
      specificity: [0, 0, 0],
      facts: createSemanticFacts(),
    });
  });

  assert.equal(arena.nodes[1].status, 'opaque');
  assert.equal(arena.nodes[1].specificity, undefined);
});

test('arena rejects overlapping and out-of-order sibling spans', () => {
  const tokenList = tokens('.a.b');
  assert.throws(
    () =>
      buildSelectorArena('.a.b', tokenList, (builder) => {
        const root = builder.open('compound', 0, tokenList.length);
        builder.leaf('class', 0, 3);
        builder.leaf('class', 2, tokenList.length);
        builder.closeSummary(root, {
          status: 'valid',
          specificity: [0, 2, 0],
          facts: createSemanticFacts(),
        });
      }),
    /ordered and non-overlapping/
  );
  assert.throws(
    () =>
      buildSelectorArena('.a.b', tokenList, (builder) => {
        const root = builder.open('compound', 0, tokenList.length);
        builder.leaf('class', 2, tokenList.length);
        builder.leaf('class', 0, 2);
        builder.closeSummary(root, {
          status: 'valid',
          specificity: [0, 2, 0],
          facts: createSemanticFacts(),
        });
      }),
    /ordered and non-overlapping/
  );
});

test('arena rejects malformed root preorder shape at completion', () => {
  const tokenList = tokens('.a');
  assert.throws(
    () =>
      buildSelectorArena('.a', tokenList, (builder) => {
        builder.leaf('class', 0, tokenList.length);
        builder.leaf('class', 0, tokenList.length);
      }),
    /single preorder root/
  );
  assert.throws(
    () =>
      buildSelectorArena('.a', tokenList, (builder) => {
        builder.leaf('class', 0, 1);
      }),
    /root token span/
  );
  assert.throws(
    () =>
      buildSelectorArena('.a', tokenList, (builder) => {
        builder.leaf('class', 0, tokenList.length);
      }),
    /arena root must be a selector list/
  );
});

test('arena rejects payload indexes that do not match the node table', () => {
  const tokenList = tokens('.a');
  assert.throws(
    () =>
      buildSelectorArena('.a', tokenList, (builder) => {
        const root = builder.open('list', 0, tokenList.length, { payload: 4 });
        builder.closeSummary(root, {
          status: 'valid',
          specificity: [0, 1, 0],
          facts: createSemanticFacts(),
        });
      }),
    /payload index/
  );
  assert.throws(
    () =>
      buildSelectorArena('.a', tokenList, (builder) => {
        builder.leaf('class', 0, tokenList.length, { payload: 0 });
      }),
    /must not have a payload index/
  );
});

test('completed arenas deeply freeze nested payload records', () => {
  const arena = parseSelectorArena('svg|a');
  const qualifiedName = arena.payloads.qualifiedNames[0];
  assert.throws(() => {
    qualifiedName.namespace.kind = 'empty';
  }, TypeError);
  assert.throws(() => {
    qualifiedName.subject.kind = 'universal';
  }, TypeError);
});

test('arena validates embedded token and argument-node references', () => {
  const tokenList = tokens(':is(.a)');
  assert.throws(
    () =>
      buildSelectorArena(':is(.a)', tokenList, (builder) => {
        const root = builder.open('list', 0, tokenList.length, {
          payload: builder.payload('lists', { mode: 'outer-unforgiving' }),
        });
        builder.leaf('pseudo', 0, tokenList.length, {
          payload: builder.payload('pseudos', {
            name: 'is',
            nameToken: tokenList.length,
            colonCount: 1,
            pseudoKind: 'class',
            specificityPolicy: 'argument',
          }),
        });
        builder.closeSummary(root);
      }),
    /invalid pseudo token reference/
  );
  assert.throws(
    () =>
      buildSelectorArena(':is(.a)', tokenList, (builder) => {
        const root = builder.open('list', 0, tokenList.length, {
          payload: builder.payload('lists', { mode: 'outer-unforgiving' }),
        });
        builder.leaf('pseudo', 0, tokenList.length, {
          payload: builder.payload('pseudos', {
            name: 'is',
            nameToken: 1,
            colonCount: 1,
            pseudoKind: 'class',
            specificityPolicy: 'argument',
            argumentNode: 0,
          }),
        });
        builder.closeSummary(root);
      }),
    /invalid pseudo argument node reference/
  );
});

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

test('iterative parser records list modes and explicit selector constructs', () => {
  for (const mode of [
    'outer-unforgiving',
    'forgiving',
    'unforgiving',
    'relative',
    'compound-only',
  ]) {
    const arena = parseSelectorArena('svg|a > [x=y i]:future(.x),|*', {
      mode,
    });
    assert.equal(arena.payloads.lists[0].mode, mode);
    assert.equal(serializeArena(arena, new Map()), arena.source);
  }
  const arena = parseSelectorArena('svg|a > [x=y i]:future(.x),|*');
  assert.deepEqual(
    arena.payloads.combinators.map(({ value }) => value),
    ['>']
  );
  assert.deepEqual(
    arena.payloads.qualifiedNames.map(({ namespace }) => namespace.kind),
    ['named', 'empty']
  );
  assert.equal(
    arena.tokens[arena.payloads.attributes[0].modifierToken][1],
    'i'
  );
  const unknownPseudo = arena.nodes.find(
    (node) =>
      node.kind === 'raw' &&
      arena.tokens
        .slice(node.startToken, node.endToken)
        .map((token) => token[1])
        .join('') === ':future(.x)'
  );
  assert.equal(unknownPseudo.status, 'opaque');
});

test('iterative parser preserves malformed balancing as one opaque raw node', () => {
  const arena = parseSelectorArena(':is(.a');
  assert.equal(arena.nodes.length, 1);
  assert.equal(arena.nodes[0].kind, 'raw');
  assert.equal(arena.nodes[0].status, 'opaque');
  assert.equal(serializeArena(arena, new Map()), ':is(.a');
});

test('list modes finalize empty-member recovery at the list boundary', () => {
  for (const source of [',.a', '.a,', '.a,,.b']) {
    assert.equal(parseSelectorArena(source).nodes[0].status, 'invalid', source);
  }
  const forgiving = parseSelectorArena(',.a,,#b,', { mode: 'forgiving' });
  assert.equal(forgiving.nodes[0].status, 'valid');
  assert.deepEqual(
    forgiving.nodes
      .filter(({ kind }) => kind === 'complex')
      .map(({ status }) => status),
    ['invalid', 'valid', 'invalid', 'valid', 'invalid']
  );
  assert.equal(
    parseSelectorArena('> .a', { mode: 'relative' }).nodes[0].status,
    'valid'
  );
  assert.equal(
    parseSelectorArena('> .a', { mode: 'outer-unforgiving' }).nodes[0].status,
    'invalid'
  );
  assert.equal(
    parseSelectorArena('.a > .b', { mode: 'compound-only' }).nodes[0].status,
    'invalid'
  );
});

test('parser applies keyframe and default-namespace context', () => {
  const keyframe = parseSelectorArena('from,50%,to', { keyframe: true });
  assert.equal(keyframe.nodes[0].status, 'valid');
  assert.equal(keyframe.payloads.lists[0].keyframe, true);

  const namespaced = parseSelectorArena('*.item', {
    hasDefaultNamespace: true,
  });
  assert.equal(
    hasSemanticFact(namespaced.nodes[0].facts, semanticFacts.namespace),
    true
  );
  assert.equal(namespaced.payloads.lists[0].hasDefaultNamespace, true);
  const compound = namespaced.nodes.find(({ kind }) => kind === 'compound');
  assert.equal(isFoldEligible(compound), false);
});

test('parser records descendant and explicit combinators with exact spans', () => {
  const arena = parseSelectorArena('a/**/b || c > d');
  const combinators = arena.nodes.filter(({ kind }) => kind === 'combinator');
  assert.deepEqual(
    combinators.map(({ payload }) => arena.payloads.combinators[payload].value),
    [' ', '||', '>']
  );
  assert.deepEqual(
    combinators.map(({ startToken, endToken }) =>
      arena.tokens
        .slice(startToken, endToken)
        .map((token) => token[1])
        .join('')
    ),
    ['/**/', '||', '>']
  );
  assert.equal(
    hasSemanticFact(arena.nodes[0].facts, semanticFacts.commentDescendant),
    true
  );
});

test('parser models every qualified-name namespace form', () => {
  for (const [source, namespaceKind, subjectKind] of [
    ['ns|E', 'named', 'type'],
    ['*|E', 'wildcard', 'type'],
    ['|E', 'empty', 'type'],
    ['ns|*', 'named', 'universal'],
    ['*|*', 'wildcard', 'universal'],
    ['|*', 'empty', 'universal'],
  ]) {
    const arena = parseSelectorArena(source);
    assert.equal(arena.nodes[0].status, 'valid', source);
    assert.equal(
      arena.payloads.qualifiedNames[0].namespace.kind,
      namespaceKind
    );
    assert.equal(arena.payloads.qualifiedNames[0].subject.kind, subjectKind);
  }
});

test('parser records exact attribute grammar and case behavior', () => {
  const arena = parseSelectorArena('[ns|data-name ~= "Value" i]');
  assert.deepEqual(arena.payloads.attributes[0], {
    namespace: { kind: 'named', token: 1 },
    nameToken: 3,
    matcher: '~=',
    valueToken: 8,
    modifierToken: 10,
    caseBehavior: 'ascii-insensitive',
  });
  assert.deepEqual(arena.nodes[0].specificity, [0, 1, 0]);
  assert.equal(
    hasSemanticFact(arena.nodes[0].facts, semanticFacts.attributeModifier),
    true
  );
  assert.equal(parseSelectorArena('[x=]').nodes[0].status, 'invalid');
  const escaped = parseSelectorArena('[x=y \\69]');
  assert.equal(escaped.nodes[0].status, 'valid');
  assert.equal(
    escaped.payloads.attributes[0].caseBehavior,
    'ascii-insensitive'
  );
});

test('selector-list pseudos own nested arena children and specificity', () => {
  const arena = parseSelectorArena(':is(.a,#b):where(div)');
  const pseudos = arena.nodes.filter(({ kind }) => kind === 'pseudo');
  assert.equal(pseudos.length, 2);
  assert.equal(
    arena.nodes[arena.payloads.pseudos[pseudos[0].payload].argumentNode].kind,
    'list'
  );
  assert.deepEqual(pseudos[0].specificity, [1, 0, 0]);
  assert.deepEqual(pseudos[1].specificity, [0, 0, 0]);
  assert.deepEqual(arena.nodes[0].specificity, [1, 0, 0]);
});

test('parser finalizes compound semantic facts conservatively', () => {
  const arena = parseSelectorArena('svg|a#id.c[x=y i]:hover::before');
  const compound = arena.nodes.find(({ kind }) => kind === 'compound');
  assert.deepEqual(compound.specificity, [1, 3, 2]);
  assert.equal(hasSemanticFact(compound.facts, semanticFacts.namespace), true);
  assert.equal(
    hasSemanticFact(compound.facts, semanticFacts.attributeModifier),
    true
  );
  assert.equal(
    hasSemanticFact(compound.facts, semanticFacts.pseudoElement),
    true
  );
  assert.equal(isFoldEligible(compound), false);

  const unknown = parseSelectorArena(':future(.x)');
  assert.equal(unknown.nodes[0].status, 'opaque');
  assert.equal(unknown.nodes[0].specificity, undefined);
});

test('arena interns specificity tuples with stable numeric identities', () => {
  const arena = parseSelectorArena('.a,.b,#id');
  const compounds = arena.nodes.filter(({ kind }) => kind === 'compound');
  assert.equal(compounds[0].specificityId, compounds[1].specificityId);
  assert.notEqual(compounds[0].specificityId, compounds[2].specificityId);
  assert.equal(
    arena.specificities[compounds[0].specificityId],
    compounds[0].specificity
  );
  assert.equal(Object.isFrozen(arena.specificities), true);
  assert.equal(Object.isFrozen(compounds[0].specificity), true);
});

test('parser applies functional pseudo grammar specificity policies', () => {
  for (const [source, expected] of [
    [':host(.a)', [0, 2, 0]],
    ['::slotted(div.a)', [0, 1, 2]],
    [':nth-child(2n + 1 of .a,#b)', [1, 1, 0]],
    [':nth-of-type(even)', [0, 1, 0]],
    ['::view-transition-old(*)', [0, 0, 0]],
    ['::view-transition-old(foo.bar)', [0, 0, 1]],
  ]) {
    const arena = parseSelectorArena(source);
    assert.equal(arena.nodes[0].status, 'valid', source);
    assert.deepEqual(arena.nodes[0].specificity, expected, source);
  }
  const nth = parseSelectorArena(':nth-child(odd of .a,#b)');
  const pseudo = nth.nodes.find(({ kind }) => kind === 'pseudo');
  assert.equal(
    nth.nodes[nth.payloads.pseudos[pseudo.payload].argumentNode].kind,
    'list'
  );
  assert.equal(
    parseSelectorArena(':nth-child(+ n)').nodes[0].status,
    'invalid'
  );
});

test('parser distinguishes known-invalid compounds from opaque syntax', () => {
  for (const source of ['*div', '.a*#b', '.', 'div span|', ':', ':::']) {
    assert.equal(parseSelectorArena(source).nodes[0].status, 'invalid', source);
  }
  assert.equal(parseSelectorArena(':future(.x)').nodes[0].status, 'opaque');
  assert.equal(parseSelectorArena('& .a').nodes[0].status, 'opaque');
});

test('parser applies contextual pseudo-element and nested-has recovery', () => {
  assert.equal(
    hasSemanticFact(
      parseSelectorArena(':has(.a)').nodes[0].facts,
      semanticFacts.nestedHas
    ),
    false
  );
  for (const source of [':has(:has(.a))', ':has(:is(:has(.a)))']) {
    const arena = parseSelectorArena(source);
    assert.equal(arena.nodes[0].status, 'invalid', source);
    assert.equal(
      hasSemanticFact(arena.nodes[0].facts, semanticFacts.nestedHas),
      true,
      source
    );
  }
  assert.deepEqual(
    parseSelectorArena(':is(.a,::before)').nodes[0].specificity,
    [0, 1, 0]
  );
  assert.equal(parseSelectorArena(':not(::before)').nodes[0].status, 'invalid');
});

test('production parsing retains full arena structure before normalization', () => {
  const arena = parseSelectorArena('.card:is(.active,.pending)', {
    hasDefaultNamespace: true,
  });
  assert.equal(arena.nodes[0].kind, 'list');
  assert.ok(arena.nodes.some(({ kind }) => kind === 'compound'));
  assert.ok(arena.nodes.some(({ kind }) => kind === 'pseudo'));
});

test('verified and trusted parsing have equivalent semantic arenas', () => {
  for (const source of [
    '.a,.b',
    'svg|a > [x=y i]:future(.x),|*',
    ':is(.a,#b):where(div)',
    ':nth-child(odd of .a,#b)',
    ':is(.a',
  ]) {
    const verified = parseSelectorArena(source);
    const trusted = parseSelectorArena(source, { verifyArena: false });

    assert.deepEqual(trusted, verified, source);
    assert.equal(serializeArena(trusted, new Map()), source);
    assert.equal(Object.isFrozen(verified.nodes), true);
    assert.equal(Object.isFrozen(trusted.nodes), false);
  }
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

test('compound-only pseudo arguments reject selector lists', () => {
  for (const source of [':host(.a,.b)', ':host-context(.a,.b)'])
    assert.equal(parseSelectorArena(source).nodes[0].status, 'invalid', source);
});

test('literal non-ASCII identifier continuations remain one qualified name', () => {
  const source = 'a\uE0000\uE001';
  const arena = parseSelectorArena(source);
  assert.equal(arena.nodes[0].status, 'valid');
  const qualified = arena.nodes.find(({ kind }) => kind === 'qualified-name');
  assert.equal(
    arena.tokens
      .slice(qualified.startToken, qualified.endToken)
      .map((token) => token[1])
      .join(''),
    source
  );
  assert.deepEqual(arena.nodes[0].specificity, [0, 0, 1]);
});
