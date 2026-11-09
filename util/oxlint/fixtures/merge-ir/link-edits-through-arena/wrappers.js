// Every wrapper edits the chain through this.#links, so each is allowed and
// each required site is present.
class Records {
  #links = new BlockLinks();

  linkBefore(sibling, index) {
    this.#links.linkBefore(sibling, index);
  }

  linkLast(block, index) {
    this.#links.linkLast(block, index);
  }

  unlink(index) {
    this.#links.unlink(index);
  }
}
