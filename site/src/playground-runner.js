/** @import {PresetName, CssNanoWorker, MinificationResult, MinificationSuccess} from './types.js'*/

export class PlaygroundRunner {
  #cssnanoWorker;
  /** @type {PromiseWithResolvers<MinificationSuccess> | undefined} */
  #pendingMinification;

  /** @param {CssNanoWorker} cssnanoWorker */
  constructor(cssnanoWorker) {
    this.#cssnanoWorker = cssnanoWorker;
    this.#cssnanoWorker.onmessage = (event) => {
      this.#receiveMinificationResult(event.data);
    };
    this.#cssnanoWorker.onerror = (event) => this.#receiveWorkerError(event);
    this.#cssnanoWorker.onmessageerror = () =>
      this.#rejectPendingMinification(
        new Error('Minifier worker message deserialization failed')
      );
  }

  /** @param {string} input
   * @param {PresetName} preset
   * @returns {Promise<string>} */
  async minimizeCss(input, preset) {
    if (this.#pendingMinification) {
      throw new Error('Minification is busy');
    }
    const pendingMinification = Promise.withResolvers();
    this.#pendingMinification = pendingMinification;
    try {
      this.#cssnanoWorker.postMessage({ input, config: preset });
    } catch (err) {
      this.#rejectPendingMinification(
        err instanceof Error ? err : new Error(String(err))
      );
    }
    const { css } = await pendingMinification.promise;
    return css;
  }

  /** @param {ErrorEvent} ev */
  #receiveWorkerError(ev) {
    const msg =
      'message' in ev && typeof ev.message === 'string'
        ? ev.message
        : 'Worker error';
    this.#rejectPendingMinification(new Error(msg));
  }

  /** @param {MinificationResult} result */
  #receiveMinificationResult(result) {
    const pendingMinification = this.#takePendingMinification();
    if (!pendingMinification) {
      return;
    }
    if (result.ok) {
      pendingMinification.resolve(result);
    } else {
      pendingMinification.reject(new Error(result.error.message));
    }
  }

  /** @param {Error} err */
  #rejectPendingMinification(err) {
    const pendingMinification = this.#takePendingMinification();
    if (!pendingMinification) {
      return;
    }
    pendingMinification.reject(err);
  }

  #takePendingMinification() {
    const pendingMinification = this.#pendingMinification;
    this.#pendingMinification = undefined;
    return pendingMinification;
  }
}
