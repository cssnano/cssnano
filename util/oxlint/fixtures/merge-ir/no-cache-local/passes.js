// A rule is read through its records; no variable holds its declaration cache.
export function selectorsOf(records, index) {
  const rule = records.rule(index);
  return rule.selectors;
}
