// A rule file places and moves entries, which only the edit modules may do.
function fold(records, container, index, sibling) {
  records.moveLast(container, index);
  records.detach(index);
  records.insertEntryBefore(sibling, index);
}
