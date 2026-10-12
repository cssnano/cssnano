/**
 * Gap that lets screen readers register the cleared region before the new
 * text arrives. Long enough to be registered, short enough not to feel slow.
 */
const ANNOUNCE_DELAY_MS = 100;

export class StatusAnnouncer {
  /** @type {{ textContent: string | null }} */
  #region;
  /** @type {(callback: () => void, delay: number) => unknown} */
  #schedule;
  /** @type {(handle: unknown) => void} */
  #cancel;
  /** @type {unknown} */
  #pending;

  /**
   * @param {{ textContent: string | null }} region live region that screen readers watch
   * @param {{
   *   schedule?: (callback: () => void, delay: number) => unknown,
   *   cancel?: (handle: unknown) => void
   * }} [timers] injectable so tests can run the delay without waiting
   */
  constructor(
    region,
    {
      schedule = (callback, delay) => setTimeout(callback, delay),
      cancel = (handle) => clearTimeout(/** @type {any} */ (handle)),
    } = {}
  ) {
    this.#region = region;
    this.#schedule = schedule;
    this.#cancel = cancel;
  }

  /** @param {string} message */
  announce(message) {
    this.#cancel(this.#pending);
    this.#region.textContent = '';
    this.#pending = this.#schedule(() => {
      this.#region.textContent = message;
    }, ANNOUNCE_DELAY_MS);
  }
}
