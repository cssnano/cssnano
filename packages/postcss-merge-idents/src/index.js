import cssnanoUtils from 'cssnano-utils';
import { LayerRegistry, compareAtRulePriority } from './lib/layerRegistry.js';
import {
  classifyDeclaration,
  getBody,
  getContainer,
  parseAtRuleName,
} from './lib/grammar.js';
import { rewriteDeclaration } from './lib/valueRewriter.js';

const { asciiLowerCase } = cssnanoUtils;

/**
 * @typedef {{
 *   rule: import('postcss').AtRule,
 *   body?: string,
 *   layerPriority: number[],
 *   documentIndex: number,
 *   parsed: { isString: boolean, isReservedName: boolean, key: string, tokenText: string }
 * }} AtRuleEntry
 *
 * @typedef {{
 *   entries: AtRuleEntry[],
 *   resolver?: (key: string) => { text: string, key: string } | undefined,
 *   definedNames?: Set<string>
 * }} FamilyRecord
 */

/**
 * Collects the entries that may join a cross-name merge group: repeat
 * definitions of one name collapse to their highest priority copy first, and
 * only when all copies share a body. Reserved names never merge because a
 * stylesheet that spells one is not free to take another spelling.
 *
 * @param {Map<string, AtRuleEntry[]>} byName
 * @param {Set<import('postcss').AtRule>} removals
 * @return {AtRuleEntry[]}
 */
function collectEligibleEntries(byName, removals) {
  /** @type {AtRuleEntry[]} */
  const eligible = [];

  for (const list of byName.values()) {
    if (list.length === 1) {
      if (!list[0].parsed.isReservedName) {
        eligible.push(list[0]);
      }
      continue;
    }
    const firstBody = getBody(list[0]);
    if (!list.every((item) => getBody(item) === firstBody)) {
      continue;
    }
    let survivor = list[0];
    for (let i = 1; i < list.length; i++) {
      if (compareAtRulePriority(survivor, list[i]) < 0) {
        survivor = list[i];
      }
    }
    for (const item of list) {
      if (item !== survivor) {
        removals.add(item.rule);
      }
    }
    if (!survivor.parsed.isReservedName) {
      eligible.push(survivor);
    }
  }

  return eligible;
}

/**
 * @param {AtRuleEntry[]} entries
 * @param {Set<import('postcss').AtRule>} removals
 * @return {{ resolver: (key: string) => { text: string, key: string } | undefined, definedNames: Set<string>, hasReplacements: boolean }}
 */
function processAtRuleEntries(entries, removals) {
  const definedNames = new Set();
  if (entries.length === 0) {
    return {
      resolver: () => undefined,
      definedNames,
      hasReplacements: false,
    };
  }

  for (const entry of entries) {
    definedNames.add(entry.parsed.key);
  }

  if (entries.length === 1) {
    return {
      resolver: () => undefined,
      definedNames,
      hasReplacements: false,
    };
  }

  /** @type {Map<string, AtRuleEntry[]>} */
  const byName = new Map();
  for (const entry of entries) {
    let nameList = byName.get(entry.parsed.key);
    if (!nameList) {
      nameList = [];
      byName.set(entry.parsed.key, nameList);
    }
    nameList.push(entry);
  }

  const eligible = collectEligibleEntries(byName, removals);

  /** @type {Map<string, AtRuleEntry[]>} */
  const groupsByBody = new Map();

  for (const item of eligible) {
    const groupKey = (item.parsed.isString ? 's:' : 'i:') + getBody(item);
    let group = groupsByBody.get(groupKey);
    if (!group) {
      group = [];
      groupsByBody.set(groupKey, group);
    }
    group.push(item);
  }

  /** @type {Map<string, { text: string, key: string }>} */
  const resolved = new Map();

  for (const group of groupsByBody.values()) {
    if (group.length > 1) {
      let survivor = group[0];
      for (let i = 1; i < group.length; i++) {
        if (compareAtRulePriority(survivor, group[i]) < 0) {
          survivor = group[i];
        }
      }
      for (const item of group) {
        if (item !== survivor) {
          removals.add(item.rule);
          resolved.set(item.parsed.key, {
            text: survivor.parsed.tokenText,
            key: survivor.parsed.key,
          });
        }
      }
    }
  }

  return {
    resolver: (key) => resolved.get(key),
    definedNames,
    hasReplacements: resolved.size > 0,
  };
}

/**
 * Finds or creates the family record of one at-rule name in one container.
 *
 * @param {Map<import('postcss').Container, Map<string, FamilyRecord>>} scopes
 * @param {import('postcss').Container} container
 * @param {string} name
 * @return {FamilyRecord}
 */
function familyRecordFor(scopes, container, name) {
  let containerScope = scopes.get(container);
  if (!containerScope) {
    containerScope = new Map();
    scopes.set(container, containerScope);
  }
  let familyData = containerScope.get(name);
  if (!familyData) {
    familyData = { entries: [] };
    containerScope.set(name, familyData);
  }
  return familyData;
}

/**
 * @param {import('postcss').Root} css
 * @return {void}
 */
function mergeAtRules(css) {
  const layerRegistry = new LayerRegistry();
  let keyframesCount = 0;
  let counterStyleCount = 0;
  let documentIndex = 0;

  /** @type {Map<import('postcss').Container, Map<string, FamilyRecord>>} */
  const scopes = new Map();

  css.walkAtRules((atRule) => {
    const name = asciiLowerCase(atRule.name);
    if (name === 'layer') {
      layerRegistry.declareLayerAtRule(atRule);
      return;
    }

    const isKeyframes = name.endsWith('keyframes');
    const isCounterStyle = name.endsWith('counter-style');
    if (!isKeyframes && !isCounterStyle) {
      return;
    }

    if (isKeyframes) {
      keyframesCount++;
    } else {
      counterStyleCount++;
    }

    const container = getContainer(atRule);
    const familyData = familyRecordFor(scopes, container, name);

    const parsed = parseAtRuleName(atRule.params, name);
    if (parsed) {
      familyData.entries.push({
        rule: atRule,
        parsed,
        layerPriority: layerRegistry.getPriority(atRule),
        documentIndex: documentIndex++,
      });
    }
  });

  if (keyframesCount < 2 && counterStyleCount < 2) {
    return;
  }

  /** @type {Set<import('postcss').AtRule>} */
  const removals = new Set();
  let hasReplacements = false;

  for (const containerScope of scopes.values()) {
    for (const familyData of containerScope.values()) {
      const result = processAtRuleEntries(familyData.entries, removals);
      familyData.resolver = result.resolver;
      familyData.definedNames = result.definedNames;
      if (result.hasReplacements) {
        hasReplacements = true;
      }
    }
  }

  if (removals.size === 0) {
    return;
  }

  if (hasReplacements) {
    const singleScope =
      scopes.size === 1 ? (scopes.values().next().value ?? null) : null;

    css.walkDecls((decl) => {
      const classification = classifyDeclaration(decl);
      if (classification) {
        rewriteDeclaration(decl, classification, scopes, singleScope);
      }
    });
  }

  for (const node of removals) {
    node.remove();
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
