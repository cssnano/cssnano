import { test } from 'node:test';
import assert from 'node:assert';
import { defaultDescription, pageMeta } from '../src/utils/pageMeta.js';

test('home page title is the bare title, without the site name suffix', () => {
  assert.strictEqual(
    pageMeta({ title: 'cssnano', home: true }).pageTitle,
    'cssnano'
  );
});

test('inner page title gets the site name suffix', () => {
  assert.strictEqual(
    pageMeta({ title: 'Presets' }).pageTitle,
    'Presets · cssnano'
  );
});

test('page without a description falls back to the site description', () => {
  assert.strictEqual(
    pageMeta({ title: 'Blog' }).description,
    defaultDescription
  );
});

test('page with a description keeps its own description', () => {
  assert.strictEqual(
    pageMeta({ title: 'Presets', description: 'Choose a preset.' }).description,
    'Choose a preset.'
  );
});

test('page without a type is a website, not an article', () => {
  assert.strictEqual(pageMeta({ title: 'Presets' }).type, 'website');
});

test('blog post type is passed through as an article', () => {
  assert.strictEqual(
    pageMeta({ title: 'cssnano 5 is available', type: 'article' }).type,
    'article'
  );
});
