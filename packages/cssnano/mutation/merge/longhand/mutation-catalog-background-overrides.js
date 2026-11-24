export const name = 'merge-longhand: redundant background longhands';
export const target = new URL(
  '../../../src/merge/longhand/decl/backgroundOverrides.js',
  import.meta.url
).href;
export const test = new URL(
  '../../../test/merge/longhand/*.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'run below the support floor',
    find: '  if (!longstandingFeatures.isSubsetOf(features)) return;',
    replace: '',
  },
  {
    name: 'record a shorthand some target ignores',
    find: '    if (needsUnmetSupport(node, features)) return false;',
    replace: '',
  },
  {
    name: 'record a hacked shorthand',
    find: '    if (hasHack(node.before, node.prop, node.value)) return false;\n    // A shorthand',
    replace: '    // A shorthand',
  },
  {
    name: 'keep the lane across a prefixed background alias',
    find: "    if (withoutVendorPrefix(prop).startsWith('background')) lane.clear();",
    replace: "    if (prop.startsWith('background')) lane.clear();",
  },
  {
    name: 'match an escaped property name as written',
    find: "  const prop = node.prop.includes('\\\\')\n    ? decodedPropertyName(node.prop)\n    : asciiLowerCase(node.prop);",
    replace: '  const prop = asciiLowerCase(node.prop);',
  },
  {
    name: 'share one lane between importances',
    find: '    const lane = lanes[node.important ? 1 : 0];',
    replace: '    const lane = lanes[0];',
  },
  {
    name: 'keep the lane across a run end',
    find: '    if (position === RUN_END) {\n      resetLanes(lanes);\n      continue;\n    }',
    replace: '    if (position === RUN_END) continue;',
  },
  {
    name: 'drop any known longhand whatever its value',
    find: '    known === longhandValue(node, prop) &&',
    replace: '',
  },
  {
    name: 'keep the value a differing longhand replaced',
    find: '  if (redundant) return true;\n  lane.delete(prop);',
    replace: '  if (redundant) return true;',
  },
  {
    name: 'accept a url() token with a component written right after it',
    find: '  if (first[0] === TokenType.URL) return end - start === 1;',
    replace: '  if (first[0] === TokenType.URL) return true;',
  },
  {
    name: 'accept rebeccapurple',
    find: "  return name !== 'rebeccapurple' && namedColors.has(name);",
    replace: '  return namedColors.has(name);',
  },
  {
    name: 'parse a multi-layer shorthand',
    find: '  if (parts?.length !== 1) return;',
    replace: '  if (parts === null) return;',
  },
  {
    name: 'set the clip from the first box keyword',
    find: "    lane.set('background-clip', boxes[boxes.length - 1]);",
    replace: "    lane.set('background-clip', boxes[0]);",
  },
  {
    name: 'accept a second image or colour',
    find: '    if (values.has(parsed.prop)) return;',
    replace: '',
  },
];
