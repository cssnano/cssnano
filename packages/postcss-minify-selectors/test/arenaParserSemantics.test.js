import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  hasSemanticFact,
  isFoldEligible,
  semanticFacts,
} from '../src/lib/arena.js';
import { parseSelectorArena } from '../src/lib/parseArena.js';
import { serializeArena } from '../src/lib/serializeArena.js';

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
  assert.equal(compounds[0].specificity, compounds[1].specificity);
  assert.equal('specificities' in arena, false);
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

test('compound-only pseudo arguments reject selector lists', () => {
  for (const source of [':host(.a,.b)', ':host-context(.a,.b)'])
    assert.equal(parseSelectorArena(source).nodes[0].status, 'invalid', source);
});
