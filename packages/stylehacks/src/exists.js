'use strict';

export default function exists (selector, index, value) {
    let node = selector.at(index);
    return node && node.value === value;
}
