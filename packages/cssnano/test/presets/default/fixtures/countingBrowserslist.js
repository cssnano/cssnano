import { createRequire } from 'node:module';

const require = createRequire(
  new URL('../../../../package.json', import.meta.url)
);
const browserslist = require('browserslist');

export default function countingBrowserslist(...args) {
  globalThis.browserslistCalls = (globalThis.browserslistCalls ?? 0) + 1;
  return browserslist(...args);
}

countingBrowserslist.loadConfig = browserslist.loadConfig;
