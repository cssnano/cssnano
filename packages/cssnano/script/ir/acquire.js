/**
 * Builds src/ir/data/properties.json and the property groups the tests use as
 * a reference from @webref/css. The shorthand structure comes from the freshly
 * built longhands.json, so the two data sets always agree.
 * `script/acquire.js` writes them, and `pnpm test` checks that the committed
 * copies match.
 */
import {
  buildProperties,
  buildPropertyGroups,
  longhandsSetBy,
  serializeProperties,
  serializePropertyGroups,
  validate,
  validateProperties,
} from './lib/webrefProperties.js';

/**
 * @param {{ webref: any, longhands: { shorthands: Record<string, {longhands: string[], resets: string[]}> } }} inputs
 * @return {{ files: Record<string, string>, summary: string }}
 */
export function acquire({ webref, longhands }) {
  const { properties } = webref;

  const entries = buildProperties(properties);
  validateProperties(entries, {
    shorthands: Object.keys(longhands.shorthands),
    setsLonghands: longhandsSetBy(longhands.shorthands),
  });
  const groups = buildPropertyGroups(properties);
  validate(groups);

  return {
    files: {
      'src/ir/data/properties.json': serializeProperties(entries),
      'script/ir/lib/propertyGroups.json': serializePropertyGroups(groups),
    },
    summary: `${Object.keys(entries).length} properties`,
  };
}
