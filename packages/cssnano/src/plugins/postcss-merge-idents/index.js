import {
  createRecordSymbolLists,
  isRecordAttached,
  recordSymbolVisit,
} from '../../pipeline/symbolLists.js';
import { AT_RULE_BLOCK } from '../../passes/ir/blockRecord.js';
import { runRecordsPlugin } from '../../passes/ir/recordsPlugin.js';
import { remove as removeRecord } from '../../passes/ir/treeEdits.js';
import { visitEntriesInOrder } from '../../passes/ir/visitEntries.js';
import { atRuleAt } from '../../passes/ir/declaredText.js';
import { LayerRegistry, hasImport } from './lib/layerRegistry.js';
import {
  findInterchangeableGroups,
  mergeInterchangeable,
} from './lib/interchangeable.js';
import {
  getConditionContainer,
  parseAtRuleName,
  VENDOR_PREFIX,
} from './lib/grammar.js';
import { scanDeclarations } from './lib/protectedNames.js';
import { preludeTokens } from './lib/trailingEscape.js';
import { rewriteReferences } from './lib/valueRewriter.js';

/** @import {DeclarationKeys} from '../../passes/ir/declarationKey.js' */
/** @import {ArenaIndex} from '../../passes/ir/blockRecord.js' */
/** @import {AtRuleEntry, Group} from './lib/interchangeable.js' */
/** @import {BlockRecords} from '../../passes/ir/blockRecords.js' */
/** @import {RecordSymbolLists} from '../../pipeline/symbolLists.js' */
/** @import {RunContext} from '../../passes/ir/runContext.js' */

/**
 * @param {BlockRecords} records
 * @param {ArenaIndex} atRule
 * @param {Map<ArenaIndex, number>} containerIds
 * @return {number} the id of the condition container defining the at-rule
 */
function containerIdOf(records, atRule, containerIds) {
  const container = getConditionContainer(records, atRule);
  let containerId = containerIds.get(container);
  if (containerId === undefined) {
    containerId = containerIds.size;
    containerIds.set(container, containerId);
  }
  return containerId;
}

/**
 * @param {BlockRecords} records
 * @param {RecordSymbolLists} lists
 * @return {boolean} whether this stylesheet alone decides its layer order
 */
function isLayerOrderKnown(records, lists) {
  const definition =
    lists.keyframes.find((index) => isRecordAttached(records, index)) ??
    lists.counterStyles.find((index) => isRecordAttached(records, index));
  return definition === undefined || !hasImport(records);
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
 * Merges the names of the lists the walk up collected. An entry that
 * an earlier transform detached is skipped, as the lists still hold it.
 *
 * @param {RecordSymbolLists} lists
 * @param {(index: ArenaIndex) => void} remove
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @return {void}
 */
function mergeAtRules(lists, remove, records, context) {
  const { tokenLists, declarations: keys } = context;
  const layerRegistry = new LayerRegistry(records, tokenLists);
  for (const layerRule of lists.layers) {
    if (isRecordAttached(records, layerRule)) {
      layerRegistry.declareLayerAtRule(layerRule);
    }
  }
  /** @type {Map<'keyframes' | 'counter-style', AtRuleEntry[]>} */
  const namespaces = new Map([
    ['keyframes', []],
    ['counter-style', []],
  ]);
  /** @type {Map<ArenaIndex, number>} */
  const containerIds = new Map();
  const layerOrderKnown = isLayerOrderKnown(records, lists);

  // A walk visits two at-rules that do not nest in visit order, which is their
  // document order. These kinds never nest, so the position in a namespace
  // is its document order.
  for (const atRule of [...lists.keyframes, ...lists.counterStyles]) {
    if (!isRecordAttached(records, atRule)) {
      continue;
    }
    const entry = atRuleAt(records, atRule);
    const family = entry.name;
    const namespace = namespaceOf(family);
    const parsed =
      namespace &&
      parseAtRuleName(preludeTokens(records, tokenLists, atRule), family);
    // A statement without a block defines nothing.
    if (!namespace || entry.kind !== AT_RULE_BLOCK || !parsed) {
      continue;
    }
    const entries = /** @type {AtRuleEntry[]} */ (namespaces.get(namespace));

    const containerId = containerIdOf(records, atRule, containerIds);
    const layerPriority = layerRegistry.getPriority(atRule);
    /** @type {AtRuleEntry} */
    const found = {
      rule: atRule,
      parsed,
      family,
      containerId,
      layerPriority,
      documentIndex: entries.length,
    };
    // Without a known layer order, only definitions in one layer compare.
    if (!layerOrderKnown) found.layerKey = ` ${layerPriority.join('.')}`;
    entries.push(found);
  }

  if ([...namespaces.values()].every((entries) => entries.length < 2)) {
    return;
  }

  /** @type {Set<ArenaIndex>} */
  const removals = new Set();
  const groupsByNamespace = new Map(
    [...namespaces].map(([namespace, entries]) => [
      namespace,
      findInterchangeableGroups(records, keys, entries, removals),
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
          records,
          tokenLists,
          lists.decls.filter((index) => isRecordAttached(records, index)),
          groupedNames,
          lists.functions.filter((index) => isRecordAttached(records, index)),
          lists.parameterRules.filter((index) =>
            isRecordAttached(records, index)
          ),
          lists.conditionRules.filter((index) =>
            isRecordAttached(records, index)
          )
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
    rewriteReferences(records, context, references, renames);
  }

  // An earlier removal in this loop may have emptied and removed a parent.
  for (const index of removals) {
    if (isRecordAttached(records, index)) {
      remove(index);
    }
  }
}

/**
 * Merges the names of the advanced transform's lists. The walk up
 * collects the lists, so the transform needs no walk of its own.
 *
 * @param {RecordSymbolLists} lists
 * @param {Record<PropertyKey, unknown>} _options takes no options
 * @param {(index: ArenaIndex) => void} remove
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @return {void}
 */
export function mergeIdentsSymbols(lists, _options, remove, records, context) {
  mergeAtRules(lists, remove, records, context);
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-merge-idents',
    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers} helpers
     */
    OnceExit(css, { result }) {
      runRecordsPlugin(css, result, [
        (records, browsers, context) => {
          const lists = createRecordSymbolLists();
          visitEntriesInOrder(records, records.root.index, (index) =>
            recordSymbolVisit(records, context.tokenLists, lists, index)
          );
          mergeIdentsSymbols(
            lists,
            {},
            (index) => removeRecord(records, index),
            records,
            context
          );
        },
      ]);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
