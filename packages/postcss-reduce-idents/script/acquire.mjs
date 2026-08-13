/**
 * Regenerates src/data/identSlots.json from @webref/css.
 *
 * Run with `npm run acquire` after bumping the pinned @webref/css version, then
 * `pnpm fixlint`, to reformat the generated file. Commit the
 * result: a data refresh has to go through
 * the test suite before reaching users.
 */
import { writeFileSync } from 'node:fs';
import css from '@webref/css';

import { buildIdentSlots, serialize, validate } from './lib/webrefIdents.mjs';

const data = buildIdentSlots(await css.listAll());
validate(data);

const target = new URL('../src/data/identSlots.json', import.meta.url);
writeFileSync(target, serialize(data));

console.log(
  `Wrote ${data.keyframes.properties.length} keyframes, ` +
    `${data.counterStyle.properties.length + data.counterStyle.functionProperties.length} counter style, ` +
    `${data.counter.properties.length} counter and ` +
    `${data.grid.templateProperties.length + data.grid.referenceProperties.length} grid slots.`
);
