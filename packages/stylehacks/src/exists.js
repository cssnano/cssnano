export default function exists(selector, index, value) {
  const node = selector.at(index);

  return node && node.value && node.value.toLowerCase() === value;
}
