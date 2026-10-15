import { agents } from 'caniuse-lite';

/**
 * Every "name version" entry that the installed caniuse-lite lists.
 * @return {string[]}
 */
export function knownBrowsers() {
  const entries = [];
  for (const [name, agent] of Object.entries(agents)) {
    for (const version of agent.versions) {
      if (version) entries.push(`${name} ${version}`);
    }
  }
  return entries;
}
