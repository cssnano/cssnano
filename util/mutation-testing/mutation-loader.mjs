import { registerHooks } from 'node:module';
import { applyMutation } from './mutation-testing.mjs';

const target = process.env.CSSNANO_MUTATION_TARGET;
const serializedMutation = process.env.CSSNANO_MUTATION;

if (!target || !serializedMutation) {
  throw new Error(
    'CSSNANO_MUTATION_TARGET and CSSNANO_MUTATION must be provided'
  );
}

const mutation = JSON.parse(serializedMutation);

registerHooks({
  /**
   * @param {string} url
   * @param {object} context
   * @param {(url: string, context: object) => object} nextLoad
   * @returns {object}
   */
  load(url, context, nextLoad) {
    const loaded = nextLoad(url, context);
    if (url !== target) {
      return loaded;
    }

    try {
      if (typeof loaded.source !== 'string') {
        throw new TypeError(
          `Mutation target did not provide string source: ${url}`
        );
      }
      return { ...loaded, source: applyMutation(loaded.source, mutation) };
    } catch (error) {
      throw new Error(`Mutation loader error: ${error.message}`, {
        cause: error,
      });
    }
  },
});
