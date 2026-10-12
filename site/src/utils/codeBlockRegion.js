/**
 * @typedef {{ properties: Record<string, string> }} PreElement
 * @typedef {{ options: { lang?: string } }} TransformerContext
 */

/**
 * Display names for abbreviations that are read as words or acronyms. Other
 * identifiers are used as written, since upper-casing makes screen readers
 * spell them out.
 * @type {Record<string, string>} */
const languageNames = {
  css: 'CSS',
  html: 'HTML',
  json: 'JSON',
  js: 'JavaScript',
  jsx: 'JSX',
  tsx: 'TSX',
  yaml: 'YAML',
  yml: 'YAML',
  sh: 'Shell',
  shell: 'Shell',
  ts: 'TypeScript',
};

/** Identifiers for unhighlighted text, which name no language worth announcing. */
const plainTextIdentifiers = new Set(['plain', 'plaintext', 'text', 'txt']);

/**
 * Shiki transformer that names each code block as a group.
 *
 * Shiki makes every `<pre>` focusable so keyboard users can scroll it, but a
 * focusable element needs a role and an accessible name to be meaningful.
 * The language keeps the names distinct; a heading passed as `aria-labelledby`
 * takes precedence over this name when a page has one.
 *
 * @type {{ pre(this: TransformerContext, node: PreElement): void }}
 */
export const codeBlockRegionTransformer = {
  pre(node) {
    const language = this.options.lang;

    // A group is nameable without joining the landmarks list.
    node.properties.role = 'group';
    node.properties['aria-label'] =
      typeof language === 'string' &&
      language &&
      !plainTextIdentifiers.has(language)
        ? `${languageNames[language] ?? language} code sample`
        : 'Code sample';
  },
};
