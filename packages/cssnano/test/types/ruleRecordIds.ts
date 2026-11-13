import type { RuleRecord } from '../../types/passes/ir/ruleRecord.js';
import type { BlockRecords } from '../../types/passes/ir/blockRecords.js';

// Type-level checks: a rule's selector ids and its merged flag are read-only
// outside the edits of its selector list. Each line marked below must fail to
// type-check. The function is never called; it is here for the types step.
export function readRuleFields(rule: RuleRecord): readonly number[] {
  const marked: boolean = rule.marked;
  // @ts-expect-error the ids are assigned only by the edits of the list
  rule.selectorIds = [];
  // @ts-expect-error an element of the ids is not written
  rule.selectorIds[0] = 1;
  // @ts-expect-error the ids are not appended to
  rule.selectorIds.push(1);
  // @ts-expect-error the merged flag has no setter
  rule.marked = true;
  // @ts-expect-error a rule holds no selector text
  const text: string = rule.selector;
  // @ts-expect-error a rule holds no selector text
  const items: string[] = rule.selectors;
  void text;
  void items;
  return marked ? rule.selectorIds : [];
}

// A read through the records: the rule's fields need no cast.
export function readRuleThroughRecords(
  records: BlockRecords,
  index: number
): readonly number[] {
  const rule = records.rule(index);
  if (rule === undefined) return [];
  const compatible: boolean = rule.compatible;
  return compatible ? rule.selectorIds : [];
}
