import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** @import {Readable, Writable} from 'node:stream' */

/**
 * Returns a chunk handler that reassembles the NUL-separated JSON messages of
 * the DevTools pipe transport, whatever the chunk boundaries.
 *
 * @param {(message: any) => void} onMessage
 * @return {(chunk: string) => void}
 */
export function splitMessages(onMessage) {
  let pending = '';
  return (chunk) => {
    const parts = (pending + chunk).split('\0');
    pending = /** @type {string} */ (parts.pop());
    for (const part of parts) onMessage(JSON.parse(part));
  };
}

/**
 * A DevTools protocol client over a pair of streams: each command resolves
 * with its result or rejects with the protocol error that answers it.
 *
 * @param {Writable} commands
 * @param {Readable} responses
 * @return {{send: (method: string, params?: object, sessionId?: string) => Promise<any>, fail: (error: Error) => void}}
 */
export function connect(commands, responses) {
  let lastId = 0;
  /** @type {Map<number, {resolve: (value: any) => void, reject: (error: Error) => void}>} */
  const waiting = new Map();
  /** @type {Error | undefined} */
  let failure;
  responses.setEncoding('utf8');
  responses.on(
    'data',
    splitMessages((message) => {
      const handlers = waiting.get(message.id);
      if (!handlers) return;
      waiting.delete(message.id);
      if (message.error) handlers.reject(new Error(message.error.message));
      else handlers.resolve(message.result);
    })
  );
  return {
    send(method, params = {}, sessionId = undefined) {
      // Nothing answers once the browser is gone, so a later command must not wait.
      if (failure) return Promise.reject(failure);
      const id = ++lastId;
      const { promise, resolve, reject } = Promise.withResolvers();
      waiting.set(id, { resolve, reject });
      commands.write(`${JSON.stringify({ id, method, params, sessionId })}\0`);
      return promise;
    },
    fail(error) {
      failure ??= error;
      for (const { reject } of waiting.values()) reject(error);
      waiting.clear();
    },
  };
}

/**
 * Starts a headless Chromium on the pipe transport, which opens no network
 * port, and attaches to its blank page.
 *
 * @param {string} executablePath
 * @return {Promise<{evaluate: (expression: string) => Promise<any>, setMedia: (media: string) => Promise<void>, close: () => Promise<void>}>}
 */
export async function launchChromium(executablePath) {
  const profile = await mkdtemp(join(tmpdir(), 'cssnano-chromium-'));
  const browser = spawn(
    executablePath,
    [
      '--headless=new',
      '--remote-debugging-pipe',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] }
  );
  const exited = new Promise((resolve) => {
    browser.once('exit', resolve);
    // A browser that failed to spawn never exits.
    browser.once('error', resolve);
  });
  const client = connect(
    /** @type {Writable} */ (browser.stdio[3]),
    /** @type {Readable} */ (browser.stdio[4])
  );
  browser.once('error', client.fail);
  browser.once('exit', () => client.fail(new Error('Chromium exited')));

  let sessionId;
  try {
    const { targetInfos } = await client.send('Target.getTargets');
    const page = targetInfos.find(
      (/** @type {{type: string}} */ target) => target.type === 'page'
    );
    ({ sessionId } = await client.send('Target.attachToTarget', {
      targetId: page.targetId,
      flatten: true,
    }));
  } catch (error) {
    // A browser that never started must not leave its profile behind.
    browser.kill('SIGKILL');
    await exited;
    await rm(profile, { recursive: true, force: true });
    throw error;
  }

  return {
    async evaluate(expression) {
      const { result, exceptionDetails } = await client.send(
        'Runtime.evaluate',
        { expression, returnByValue: true, awaitPromise: true },
        sessionId
      );
      if (exceptionDetails) {
        throw new Error(
          exceptionDetails.exception?.description ?? exceptionDetails.text
        );
      }
      return result.value;
    },
    async setMedia(media) {
      await client.send('Emulation.setEmulatedMedia', { media }, sessionId);
    },
    async close() {
      // Closing over the protocol lets Chromium clean up its profile; the
      // kill only covers a browser that no longer answers.
      const timer = setTimeout(() => browser.kill('SIGKILL'), 5000);
      await client.send('Browser.close').catch(() => {});
      await exited;
      clearTimeout(timer);
      await rm(profile, { recursive: true, force: true });
    },
  };
}
