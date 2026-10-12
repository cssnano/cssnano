import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('../../', import.meta.url));

/** @type {Map<string, boolean>} */
const shallowByDirectory = new Map();

/**
 * @param {string} cwd
 * @param {string[]} args
 * @returns {string}
 */
function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

/**
 * @param {string} cwd
 * @returns {boolean}
 */
function isShallow(cwd) {
  let shallow = shallowByDirectory.get(cwd);
  if (shallow === undefined) {
    shallow = git(cwd, ['rev-parse', '--is-shallow-repository']) !== 'false';
    shallowByDirectory.set(cwd, shallow);
  }
  return shallow;
}

/**
 * Date of the last commit that changed `file`, or undefined when history
 * cannot say so reliably. A shallow clone attributes every file to its tip
 * commit, so a wrong date is worse than none.
 * @param {string} file path relative to the site root, or to `cwd` when given
 * @param {string} [cwd] directory whose repository holds `file`
 * @returns {Date | undefined}
 */
export function getLastModified(file, cwd = siteRoot) {
  try {
    if (isShallow(cwd)) {
      return undefined;
    }
    const committed = git(cwd, ['log', '-1', '--format=%cI', '--', file]);
    return committed ? new Date(committed) : undefined;
  } catch {
    return undefined;
  }
}
