/**
 * Where relative paths start. A browser, a partial process shim, or a deleted
 * working directory (as in a long-running watcher) has none to offer.
 * @return {string | undefined}
 */
export default function workingDirectory() {
  try {
    return globalThis.process?.cwd();
  } catch {
    return undefined;
  }
}
