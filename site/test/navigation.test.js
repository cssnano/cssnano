import { test } from 'node:test';
import assert from 'node:assert';
import { currentLink, optimisationSlug } from '../src/utils/navigation.js';

const links = [
  { href: '/docs/', match: ['/docs/'] },
  {
    href: '/docs/what-are-optimisations/',
    match: ['/docs/what-are-optimisations/', '/docs/optimisations/'],
  },
  { href: '/playground/', match: ['/playground/'] },
];

test('current link is the one whose prefix matches the page path', () => {
  assert.strictEqual(currentLink('/playground/', links), links[2]);
});

test('current link is the most specific prefix, so the guide does not claim optimisation pages', () => {
  assert.strictEqual(
    currentLink('/docs/optimisations/minify-gradients/', links),
    links[1]
  );
});

test('current link is the broader section when no narrower prefix matches', () => {
  assert.strictEqual(currentLink('/docs/introduction/', links), links[0]);
});

test('current link is undefined when no prefix matches the page path', () => {
  assert.strictEqual(currentLink('/blog/', links), undefined);
});

test('current link falls back to the href when a link has no match list', () => {
  const sidebar = [{ href: '/docs/changelog/' }, { href: '/docs/community/' }];
  assert.strictEqual(currentLink('/docs/community/', sidebar), sidebar[1]);
});

test('optimisation slug is the lower-cased short name', () => {
  assert.strictEqual(
    optimisationSlug('cssDeclarationSorter'),
    'cssdeclarationsorter'
  );
});

test('optimisation slug leaves a name that is already lower-case unchanged', () => {
  assert.strictEqual(optimisationSlug('calc'), 'calc');
});
