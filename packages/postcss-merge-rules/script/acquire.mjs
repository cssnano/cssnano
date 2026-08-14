/**
 * Regenerates src/data/propertyGroups.json from @webref/css.
 *
 * Run with `npm run acquire` after bumping the pinned @webref/css version, then
 * `pnpm fixlint` to reformat the generated file. Commit the result because
 * a data refresh has to go through the test suite.
 */
import { writeFileSync } from 'node:fs';
import css from '@webref/css';

import {
  buildPropertyGroups,
  serialize,
  validate,
} from './lib/webrefProperties.mjs';

const { properties } = await css.listAll();

const data = buildPropertyGroups(properties);
validate(data);

const target = new URL('../src/data/propertyGroups.json', import.meta.url);
writeFileSync(target, serialize(data));

console.log(
  `Wrote ${data.properties.length} properties, ${data.shorthands.size} shorthands, ` +
    `${data.aliases.size} aliases and ${data.logicalGroups.size} logical group members.`
);
