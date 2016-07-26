import plugin from '../plugin';
import {IE_6} from '../dictionary/browsers';
import {PROPERTY} from '../dictionary/identifiers';
import {DECL} from '../dictionary/postcss';

export default plugin([IE_6], [DECL], function (decl) {
    let before = decl.raws.before;
    if (!before) {
        return;
    }
    if (~before.indexOf('_') || ~before.indexOf('-')) {
        this.push(decl, {
            identifier: PROPERTY,
            hack: `${before.trim()}${decl.prop}`,
        });
    }
});
