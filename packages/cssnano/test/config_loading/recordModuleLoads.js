import { appendFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

// Synchronous hooks also see require(), which loads the advanced preset.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const result = nextResolve(specifier, context);
    appendFileSync(process.env.MODULE_LOAD_LOG, `${result.url}\n`);
    return result;
  },
});
