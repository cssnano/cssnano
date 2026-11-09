// The linkBefore wrapper is absent, so the required site is missing.
class Records {
  #links = new BlockLinks();

  linkLast(block, index) {
    this.#links.linkLast(block, index);
  }

  unlink(index) {
    this.#links.unlink(index);
  }
}
