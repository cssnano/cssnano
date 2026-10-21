/**
 * Regenerates src/passes/ir/data/properties.json from @webref/css.
 *
 * Run with `pnpm run acquire:passes-ir` after bumping the pinned @webref/css
 * version, then `pnpm fixlint` to reformat the generated file. Commit the
 * result, since a data refresh has to go through the test suite.
 */
import { writeFileSync } from 'node:fs';
import css from '@webref/css';

import longhands from '../../../src/passes/merge/lib/longhand/data/longhands.json' with { type: 'json' };
import { setsLonghands } from '../../../src/passes/merge/lib/longhand/spec.js';
import {
  buildProperties,
  serializeProperties,
  validateProperties,
} from './lib/webrefProperties.js';

const { properties } = await css.listAll();

const entries = buildProperties(properties);
validateProperties(entries, {
  shorthands: Object.keys(longhands.shorthands),
  setsLonghands,
});

const target = new URL(
  '../../../src/passes/ir/data/properties.json',
  import.meta.url
);
writeFileSync(target, serializeProperties(entries));

console.log(`Wrote ${Object.keys(entries).length} properties.`);
