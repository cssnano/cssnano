// A caller edits a record's chain directly, outside the arena.
function moveBlock(records, block, index) {
  records.links.linkLast(block, index);
}
