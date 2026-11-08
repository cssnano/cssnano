// The takeLinkOf wrapper is absent, so the required site is missing.
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
}
