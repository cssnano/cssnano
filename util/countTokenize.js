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
 *
 * A reread is a call whose text the same stylesheet already tokenized, so
 * `beginStylesheet` clears `seen` before each file. With `byFrame`, each call
 * is also attributed to the first cssnano source frame that made it, and
 * `checkRoundTrip` checks that each result spells its input with contiguous
 * positions, the invariant the value buffer's edits keep.
 */
export const counter = {
  /** @type {number | string | null} */
  entry: null,
  /** @type {Map<number | string | null, number>} */
  calls: new Map(),
  /** @type {Map<number | string | null, Set<string>>} */
  strings: new Map(),
  /** @type {Map<number | string | null, number>} */
  rereads: new Map(),
  /** @type {Set<string>} */
  seen: new Set(),
  byFrame: false,
  /** @type {Map<string, { calls: number, rereads: number }>} */
  frames: new Map(),
  checkRoundTrip: false,
  roundTrip: { checked: 0, mismatches: 0, first: /** @type {string[]} */ ([]) },
  beginStylesheet() {
    this.seen.clear();
  },
  /** @param {{ css?: unknown }} input The `tokenize` options; `css` is the text */
  record(input) {
    const key = this.entry;
    this.calls.set(key, (this.calls.get(key) ?? 0) + 1);
    if (typeof input.css !== 'string') return;
    let seen = this.strings.get(key);
    if (seen === undefined) {
      seen = new Set();
      this.strings.set(key, seen);
    }
    seen.add(input.css);
    const reread = this.seen.has(input.css);
    this.seen.add(input.css);
    if (reread) {
      this.rereads.set(key, (this.rereads.get(key) ?? 0) + 1);
    }
    if (this.byFrame) {
      const frame = callerFrame();
      const row = this.frames.get(frame) ?? { calls: 0, rereads: 0 };
      row.calls++;
      if (reread) row.rereads++;
      this.frames.set(frame, row);
    }
  },
  /**
   * @param {unknown} input the `tokenize` options
   * @param {readonly unknown[]} tokens what `tokenize` returned
   */
  checkResult(input, tokens) {
    if (!this.checkRoundTrip || typeof input?.css !== 'string') return;
    this.roundTrip.checked++;
    let cursor = 0;
    let spelled = '';
    let contiguous = true;
    for (const token of /** @type {unknown[][]} */ (tokens)) {
      // The tokenizer ends each list with an EOF token that has no position.
      if (token[0] === 'EOF-token') continue;
      const text = /** @type {string} */ (token[1]);
      if (token[2] !== cursor || token[3] !== cursor + text.length - 1) {
        contiguous = false;
      }
      cursor += text.length;
      spelled += text;
    }
    if (!contiguous || spelled !== input.css) {
      this.roundTrip.mismatches++;
      if (this.roundTrip.first.length < 5) {
        this.roundTrip.first.push(input.css.slice(0, 80));
      }
    }
  },
};

// The value buffer and its readers, which sit between a reducer and tokenize.
const plumbing = /\/(?:utils\/value|values\/valueBuffer)\.js$/v;

/**
 * The first cssnano source frame on the stack outside the value buffer, as
 * `file function`, so calls from one function group together whatever their
 * line numbers.
 *
 * @return {string}
 */
function callerFrame() {
  const lines = String(new Error().stack).split('\n');
  for (const line of lines) {
    if (!line.includes('/packages/cssnano/src/')) continue;
    const match = /at (?:(\S+) \()?(?:file:\/\/)?(\S+?):\d+:\d+\)?$/v.exec(
      line.trim()
    );
    if (match === null || plumbing.test(match[2])) continue;
    const [, fn = '<anonymous>', file] = match;
    return `${file.slice(file.indexOf('/packages/cssnano/src/') + 1)} ${fn}`;
  }
  return '(no cssnano frame)';
}

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
  const counter = globalThis[${JSON.stringify(COUNTER_KEY)}];
  counter.record(input);
  const tokens = real.tokenize(input, ...rest);
  counter.checkResult(input, tokens);
  return tokens;
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
