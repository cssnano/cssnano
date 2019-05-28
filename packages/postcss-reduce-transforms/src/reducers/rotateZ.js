function rotateZ(node, values) {
  if (values.length !== 1) {
    return;
  }

  // rotateZ(rz) => rotate(rz)
  node.value = 'rotate';
}

export default rotateZ;
