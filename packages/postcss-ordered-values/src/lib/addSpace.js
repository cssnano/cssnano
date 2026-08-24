/** @return {import('postcss-value-parser').SpaceNode} */
function addSpace() {
  return /** @type import('postcss-value-parser').SpaceNode */ ({
    type: 'space',
    value: ' ',
  });
}

export default addSpace;
