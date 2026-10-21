// Loaded with `node --import`, before cssnano, so every `tokenize` call that
// production code makes goes through the counter. The tokenizer itself is
// unchanged: the counter only records the input and forwards the call.
import { registerHooks } from 'node:module';

const TOKENIZER = '@csstools/css-tokenizer';
const SHIM_PROTOCOL = 'cssnano-counting-tokenizer:';
const COUNTER_KEY = 'cssnano.tokenizeCounter';

/**
 * Calls and distinct strings, per attributed entry. `entry` is set by the
 * caller around each plugin listener; calls outside any entry use `null`.
 */
export const counter = {
  /** @type {number | string | null} */
  entry: null,
  /** @type {Map<number | string | null, number>} */
  calls: new Map(),
  /** @type {Map<number | string | null, Set<string>>} */
  strings: new Map(),
  /** @param {{ css?: unknown }} input The `tokenize` options; `css` is the text */
  record(input) {
    const key = this.entry;
    this.calls.set(key, (this.calls.get(key) ?? 0) + 1);
    if (typeof input.css === 'string') {
      let seen = this.strings.get(key);
      if (seen === undefined) {
        seen = new Set();
        this.strings.set(key, seen);
      }
      seen.add(input.css);
    }
  },
};

// The shim finds the counter through the global, so it works whichever
// module instance loads it.
Reflect.set(globalThis, COUNTER_KEY, counter);

/**
 * @param {string} realUrl The tokenizer module the shim re-exports
 * @return {string} Source of a module that counts `tokenize` and forwards it
 */
function shimSource(realUrl) {
  return `
import * as real from ${JSON.stringify(realUrl)};
export * from ${JSON.stringify(realUrl)};
export function tokenize(input, ...rest) {
  globalThis[${JSON.stringify(COUNTER_KEY)}].record(input);
  return real.tokenize(input, ...rest);
}
`;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier !== TOKENIZER) {
      return nextResolve(specifier, context);
    }
    const real = nextResolve(specifier, context);
    return {
      url: `${SHIM_PROTOCOL}${encodeURIComponent(real.url)}`,
      shortCircuit: true,
    };
  },
  load(url, context, nextLoad) {
    if (!url.startsWith(SHIM_PROTOCOL)) {
      return nextLoad(url, context);
    }
    const realUrl = decodeURIComponent(url.slice(SHIM_PROTOCOL.length));
    return {
      format: 'module',
      source: shimSource(realUrl),
      shortCircuit: true,
    };
  },
});
