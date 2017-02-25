import {processCSSFactory} from '../../../../util/testHelpers';
import plugin from '..';

const {processCSS, passthroughCSS} = processCSSFactory(plugin);

export default function processCss (t, fixture, expected) {
    if (!expected) {
        return passthroughCSS(t, fixture, fixture);
    }
    return processCSS(t, fixture, expected);
}
