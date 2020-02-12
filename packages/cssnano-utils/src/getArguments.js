export default function getArguments(node) {
  return node.nodes.reduce(
    (list, child) => {
      if (child.type !== 'div') {
        list[list.length - 1].push(child);
      } else {
        list.push([]);
      }
      return list;
    },
    [[]]
  );
}
