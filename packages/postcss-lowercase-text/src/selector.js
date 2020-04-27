import parser from 'postcss-selector-parser';

const caseSensitivePseudoClassesLists = [
  ':active',
  ':hover',
  ':focus',
  ':focus-within',
  ':visited',
];

const caseSensitivePseudoClassesSet = new Set(caseSensitivePseudoClassesLists);

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
      selNode._attribute = selNode._attribute.toLowerCase();
    });
    sel.walkPseudos((selNode) => {
      const normalizeVal = selNode.value.toLowerCase();
      if (!caseSensitivePseudoClassesSet.has(normalizeVal)) {
        selNode.value = selNode.value.toLowerCase();
      }
    });

    return sel;
  }).toString();

export default transformer;
