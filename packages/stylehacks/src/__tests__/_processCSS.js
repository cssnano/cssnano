import stylehacks from '..';
import {processCSSFactory} from '../../../../util/testHelpers';

const {processor, processCSS, passthroughCSS} = processCSSFactory(stylehacks);

export default (t, fixture, expected, {target, unaffected}) => {
    return Promise.all([
        passthroughCSS(t, fixture, {env: target}),
        processCSS(t, fixture, expected, {env: unaffected}),
        processor(fixture, {lint: true, env: unaffected}).then(result => {
            t.is(result.warnings().length, 1);
        }),
    ]);
};
