import { test } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { shikiOptions } from '../src/utils/shikiOptions.js';

// Shiki is a transitive dependency of Astro, so resolve it from Astro's location.
const require = createRequire(import.meta.resolve('astro/package.json'));
const { codeToHtml } = await import(require.resolve('shiki'));

/** @param {string} lang */
function highlight(lang) {
  return codeToHtml('a { color: red; }', { lang, ...shikiOptions });
}

const html = await highlight('css');

test('code block is a group so the focusable <pre> is not listed as a landmark', () => {
  assert.match(html, /<pre[^>]*\srole="group"/v);
});

test('code block name includes its language so repeated samples stay distinct', () => {
  assert.match(html, /<pre[^>]*\saria-label="CSS code sample"/v);
});

test('code block name uses the proper name of a language whose identifier is an abbreviation', async () => {
  assert.match(
    await highlight('js'),
    /<pre[^>]*\saria-label="JavaScript code sample"/v
  );
});

test('code block name keeps an unlisted language identifier as written, so screen readers do not spell it out', async () => {
  assert.match(
    await highlight('bash'),
    /<pre[^>]*\saria-label="bash code sample"/v
  );
});

test('code block without a language gets a generic name, as an unlabelled Markdown fence does', async () => {
  assert.match(
    await highlight('plaintext'),
    /<pre[^>]*\saria-label="Code sample"/v
  );
});

test('highlighted token colours use light-dark() so each token follows the colour scheme', () => {
  assert.match(html, /<span[^>]*style="color:light-dark\(/v);
});

test('code block background uses light-dark() so the block follows the colour scheme', () => {
  assert.match(html, /<pre[^>]*style="background-color:light-dark\(/v);
});

/** @param {string} hex */
function relativeLuminance(hex) {
  const digits = hex.slice(1);
  const full =
    digits.length === 3
      ? [...digits].map((digit) => digit + digit).join('')
      : digits;
  const [red, green, blue] = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(full.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** @param {string} foreground @param {string} background */
function contrastRatio(foreground, background) {
  const [lighter, darker] = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].toSorted((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test('light code theme keeps every token at WCAG AA contrast on the light code background', async () => {
  const lightHtml = await codeToHtml(
    '/* note */ a.b:hover { color: red; content: "text"; margin: 0 1px; }',
    { lang: 'css', ...shikiOptions }
  );
  const background = lightHtml.match(
    /--shiki-light-bg:(#[0-9a-f]{3,6})/iv
  )?.[1];
  const tokenColours = [
    ...lightHtml.matchAll(/--shiki-light:(#[0-9a-f]{3,6})/giv),
  ].map(([, colour]) => colour);

  assert.ok(background && tokenColours.length > 0);
  for (const colour of tokenColours) {
    assert.ok(
      contrastRatio(colour, background) >= 4.5,
      `${colour} on ${background} is below 4.5:1`
    );
  }
});
