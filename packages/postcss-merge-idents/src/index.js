import cssnanoUtils from 'cssnano-utils';
import { LayerRegistry, compareAtRulePriority } from './lib/layerRegistry.js';
import {
  getBody,
  getConditionContainer,
  parseAtRuleName,
  VENDOR_PREFIX,
} from './lib/grammar.js';
import { scanDeclarations } from './lib/protectedNames.js';
import { createReplacement, rewriteDeclaration } from './lib/valueRewriter.js';

const { asciiLowerCase } = cssnanoUtils;

/**
 * @typedef {Array<{ name: string, copies: AtRuleEntry[] }>} Group names that
 *   are defined in the same at-rules and containers with the same body
 *
 * @typedef {{
 *   rule: import('postcss').AtRule,
 *   body?: string,
 *   layerPriority: number[],
 *   documentIndex: number,
 *   family: string,
 *   containerId: number,
 *   parsed: { isString: boolean, isReservedName: boolean, key: string, tokenText: string }
 * }} AtRuleEntry
 */

/**
 * @param {AtRuleEntry[]} entries
 * @return {AtRuleEntry}
 */
function highestPriority(entries) {
  let best = entries[0];
  for (const entry of entries) {
    if (compareAtRulePriority(best, entry) < 0) {
      best = entry;
    }
  }
  return best;
}

/**
 * Every name of a group behaves alike, so the cascade priority does not
 * matter for correctness; the shortest spelling minimizes output size and
 * priority breaks ties.
 *
 * @param {AtRuleEntry[]} entries
 * @return {AtRuleEntry}
 */
function shortestSpelling(entries) {
  const shortest = Math.min(
    ...entries.map(({ parsed }) => parsed.tokenText.length)
  );
  return highestPriority(
    entries.filter(({ parsed }) => parsed.tokenText.length === shortest)
  );
}

/**
 * Removes repeat definitions of one name that share a body and a condition
 * container, keeping the one that wins the cascade: the kept definition is
 * present whenever a removed one is.
 *
 * @param {AtRuleEntry[]} copies definitions of one name
 * @param {Set<import('postcss').AtRule>} removals
 * @return {AtRuleEntry[]} the definitions that remain
 */
function collapseSameNameCopies(copies, removals) {
  if (copies.length < 2) {
    return copies;
  }
  for (const group of Map.groupBy(copies, placementOf).values()) {
    const body = getBody(group[0]);
    if (group.length < 2 || !group.every((copy) => getBody(copy) === body)) {
      continue;
    }
    const survivor = highestPriority(group);
    for (const copy of group) {
      if (copy !== survivor) {
        removals.add(copy.rule);
      }
    }
  }
  return copies.filter((copy) => !removals.has(copy.rule));
}

/**
 * @param {AtRuleEntry} entry
 * @return {string} the at-rule family and condition container defining it
 */
function placementOf(entry) {
  return `${entry.family}@${entry.containerId}`;
}

/**
 * Makes each name of a group of interchangeable names, except the one that
 * wins the cascade, refer to the winner. A name that substituted text may
 * spell keeps its definition and is preferred as the merge target.
 *
 * @param {Group} group
 * @param {Set<string>} protectedNames
 * @param {Map<string, import('./lib/valueRewriter.js').Replacement>} renames
 * @param {Set<import('postcss').AtRule>} removals
 * @return {void}
 */
function mergeInterchangeable(group, protectedNames, renames, removals) {
  const protectedMembers = group.filter(({ name }) => protectedNames.has(name));
  const targetCandidates = (
    protectedMembers.length > 0 ? protectedMembers : group
  ).flatMap(({ copies }) => copies);
  // An identifier reference is shorter than a string and more widely
  // supported as a keyframes name.
  const identifiers = targetCandidates.filter(({ parsed }) => !parsed.isString);
  const target = shortestSpelling(
    identifiers.length > 0 ? identifiers : targetCandidates
  );
  const replacement = createReplacement(target.parsed);
  for (const { name, copies } of group) {
    if (name === target.parsed.key || protectedNames.has(name)) {
      continue;
    }
    renames.set(name, replacement);
    for (const copy of copies) {
      removals.add(copy.rule);
    }
  }
}

/**
 * Finds the groups of interchangeable names of one namespace and removes
 * repeat definitions of a single name. Two names are interchangeable when
 * their definitions, in cascade order, sit in the same at-rule families and
 * condition containers with the same bodies: whichever definition a browser
 * picks for one name, it picks the same body for the other. This lets
 * `@-webkit-keyframes` and `@keyframes` pairs merge although their bodies
 * differ. A string and an ident of one value are one name. Bodies are
 * serialized only for names that share where they are defined.
 *
 * @param {AtRuleEntry[]} entries
 * @param {Set<import('postcss').AtRule>} removals
 * @return {Group[]} groups of two or more names
 */
function findInterchangeableGroups(entries, removals) {
  if (entries.length < 2) {
    return [];
  }

  /** @type {Group} */
  const candidates = [];
  for (const [name, all] of Map.groupBy(entries, ({ parsed }) => parsed.key)) {
    const copies = collapseSameNameCopies(all, removals);
    if (!copies.some(({ parsed }) => parsed.isReservedName)) {
      candidates.push({ name, copies: copies.toSorted(compareAtRulePriority) });
    }
  }

  /** @type {Group[]} */
  const groups = [];
  const bySites = Map.groupBy(candidates, ({ copies }) =>
    copies.map(placementOf).join(' ')
  );
  for (const sameSites of bySites.values()) {
    if (sameSites.length < 2) {
      continue;
    }
    const byBodies = Map.groupBy(sameSites, ({ copies }) =>
      JSON.stringify(copies.map(getBody))
    );
    for (const sameBodies of byBodies.values()) {
      if (sameBodies.length > 1) {
        groups.push(sameBodies);
      }
    }
  }
  return groups;
}

/**
 * @param {string} family lowercase at-rule name
 * @return {'keyframes' | 'counter-style' | undefined}
 */
function namespaceOf(family) {
  // Only the prefixes whose animation properties the rewriter recognizes
  // qualify; a reference to any other family would be left dangling.
  const unprefixed = family.replace(VENDOR_PREFIX, '');
  return unprefixed === 'keyframes' || unprefixed === 'counter-style'
    ? unprefixed
    : undefined;
}

/**
 * @param {import('postcss').Root} css
 * @return {void}
 */
function mergeAtRules(css) {
  const layerRegistry = new LayerRegistry();
  /** @type {Map<'keyframes' | 'counter-style', AtRuleEntry[]>} */
  const namespaces = new Map([
    ['keyframes', []],
    ['counter-style', []],
  ]);
  /** @type {Map<import('postcss').Container, number>} */
  const containerIds = new Map();
  /** @type {import('postcss').AtRule[]} */
  const functionRules = [];
  /** @type {import('postcss').AtRule[]} */
  const parameterRules = [];
  /** @type {import('postcss').AtRule[]} */
  const conditionRules = [];
  let documentIndex = 0;

  css.walkAtRules((atRule) => {
    const family = asciiLowerCase(atRule.name);
    if (family === 'layer') {
      layerRegistry.declareLayerAtRule(atRule);
      return;
    }
    if (family === 'function') {
      functionRules.push(atRule);
      return;
    }
    // Mixin parameter defaults and @apply arguments are substituted text.
    if (family === 'mixin' || family === 'apply') {
      parameterRules.push(atRule);
      return;
    }

    if (family === 'container' || family === 'when' || family === 'else') {
      conditionRules.push(atRule);
      return;
    }

    const namespace = namespaceOf(family);
    const params = atRule.raws?.between
      ? atRule.params + atRule.raws.between
      : atRule.params;
    const parsed = namespace && parseAtRuleName(params, family);
    // A statement without a block defines nothing.
    if (!namespace || !atRule.nodes || !parsed) {
      return;
    }
    const entries = /** @type {AtRuleEntry[]} */ (namespaces.get(namespace));

    const container = getConditionContainer(atRule);
    let containerId = containerIds.get(container);
    if (containerId === undefined) {
      containerId = containerIds.size;
      containerIds.set(container, containerId);
    }
    entries.push({
      rule: atRule,
      parsed,
      family,
      containerId,
      layerPriority: layerRegistry.getPriority(atRule),
      documentIndex: documentIndex++,
    });
  });

  if ([...namespaces.values()].every((entries) => entries.length < 2)) {
    return;
  }

  /** @type {Set<import('postcss').AtRule>} */
  const removals = new Set();
  const groupsByNamespace = new Map(
    [...namespaces].map(([namespace, entries]) => [
      namespace,
      findInterchangeableGroups(entries, removals),
    ])
  );
  const groupedNames = new Set(
    [...groupsByNamespace.values()].flatMap((groups) =>
      groups.flatMap((group) => group.map(({ name }) => name))
    )
  );
  // The protection scan is needed only to merge names, never to remove
  // repeat definitions of one name.
  const { protectedNames, references } =
    groupedNames.size > 0
      ? scanDeclarations(
          css,
          groupedNames,
          functionRules,
          parameterRules,
          conditionRules
        )
      : { protectedNames: new Set(), references: [] };
  /** @type {Map<string, Map<string, import('./lib/valueRewriter.js').Replacement>>} */
  const renames = new Map();
  for (const [namespace, groups] of groupsByNamespace) {
    /** @type {Map<string, import('./lib/valueRewriter.js').Replacement>} */
    const namespaceRenames = new Map();
    for (const group of groups) {
      mergeInterchangeable(group, protectedNames, namespaceRenames, removals);
    }
    renames.set(namespace, namespaceRenames);
  }

  if (removals.size === 0) {
    return;
  }

  // Removing a repeat definition of one name leaves no reference to respell.
  if ([...renames.values()].some((namespaceRenames) => namespaceRenames.size)) {
    rewriteReferences(references, renames);
  }

  for (const node of removals) {
    node.remove();
  }
}

/**
 * @param {import('./lib/protectedNames.js').Reference[]} references
 * @param {Map<string, Map<string, import('./lib/valueRewriter.js').Replacement>>} renames
 * @return {void}
 */
function rewriteReferences(references, renames) {
  for (const { decl, classification } of references) {
    const namespaceRenames = renames.get(classification.namespace);
    if (namespaceRenames?.size) {
      rewriteDeclaration(decl, classification.kind, namespaceRenames);
    }
  }
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-merge-idents',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      mergeAtRules(css);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
