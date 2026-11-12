// An edit module calls the arena's edits, which is its job.
export function adopt(records, target, index) {
  records.moveBefore(target, index);
  records.appendEntry(target, index);
}
