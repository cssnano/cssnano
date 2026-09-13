import assert from 'node:assert/strict';
import { test } from 'node:test';
import cssnanoUtils from 'cssnano-utils';
import {
  addSemanticFact,
  addSpecificity,
  buildSelectorArena,
  createSemanticFacts,
  isFoldEligible,
  semanticFacts,
} from '../src/lib/arena.js';
import { parseSelectorArena } from '../src/lib/parseArena.js';
import { serializeArena } from '../src/lib/serializeArena.js';

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
