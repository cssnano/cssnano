import stylehacks from '..';
import { processCSSFactory } from '../../../../util/testHelpers';

const { processor, processCSS, passthroughCSS } = processCSSFactory(stylehacks);

export default (fixture, expected, { target, unaffected }, warnings = 1) => {
  return () =>
    Promise.all([
      passthroughCSS(fixture, { env: target }),
      processCSS(fixture, expected, { env: unaffected }),
      processor(fixture, { lint: true, env: unaffected }).then((result) => {
        expect(result.warnings().length).toBe(warnings);
      }),
    ]);
};
