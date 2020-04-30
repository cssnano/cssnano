import parser from 'postcss-selector-parser';

function getParsed(selectors, callback) {
  return parser(callback).processSync(selectors);
}

const transformer = (str) =>
  getParsed(str, (sel) => {
    sel.walkTags((selNode) => {
      selNode.value = selNode.value.toLowerCase();

      return selNode;
    });
    sel.walkAttributes((selNode) => {
      if (!/^DATA-/g.test(selNode._attribute)) {
        selNode._attribute = selNode._attribute.toLowerCase();
      }

      if (selNode.raws.insensitiveFlag) {
        selNode.raws.insensitiveFlag = selNode.raws.insensitiveFlag.toLowerCase();
      }
    });
    sel.walkPseudos((selNode) => {
      selNode.value = selNode.value.toLowerCase();
    });

    return sel;
  }).toString();

export default transformer;
