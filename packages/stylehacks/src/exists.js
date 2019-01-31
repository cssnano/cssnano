export default function exists (selector, index, value) {
    const node = selector.at(index);

    return node && node.value.toLowerCase() === value;
}
