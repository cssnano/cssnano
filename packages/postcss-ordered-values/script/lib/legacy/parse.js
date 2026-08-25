import valueParser from 'postcss-value-parser';

function unit(value) {
  return valueParser.unit(value);
}

function getValue(values) {
  const nodes = [];
  for (const [index, argument] of values.entries()) {
    for (const [childIndex, node] of argument.entries()) {
      if (
        index === values.length - 1 &&
        childIndex === argument.length - 1 &&
        node.type === 'space'
      )
        continue;
      nodes.push(node);
    }
    if (index !== values.length - 1) {
      nodes.at(-1).type = 'div';
      nodes.at(-1).value = ',';
    }
  }
  return valueParser.stringify(nodes);
}

function addSpace() {
  return { type: 'space', value: ' ' };
}

function getArguments(node) {
  const result = [[]];
  for (const child of node.nodes) {
    if (child.type === 'div' && child.value === ',') result.push([]);
    else result.at(-1).push(child);
  }
  return result;
}

export { addSpace, getArguments, getValue, unit };
