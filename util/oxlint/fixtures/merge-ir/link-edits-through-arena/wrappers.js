// Every wrapper edits the chain through this.#links, so each is allowed and
// each required site is present.
class Records {
  #links = new BlockLinks();

  linkAfter(block, after, index) {
    this.#links.linkAfter(block, after, index);
  }

  linkLast(block, index) {
    this.#links.linkLast(block, index);
  }

  unlink(index) {
    this.#links.unlink(index);
  }

  takeLinkOf(later, earlier) {
    this.#links.takeLinkOf(later, earlier);
  }
}
