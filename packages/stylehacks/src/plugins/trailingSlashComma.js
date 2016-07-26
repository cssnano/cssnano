import plugin from '../plugin';
import {IE_5_5, IE_6, IE_7} from '../dictionary/browsers';
import {SELECTOR} from '../dictionary/identifiers';
import {RULE} from '../dictionary/postcss';

export default plugin([IE_5_5, IE_6, IE_7], [RULE], function (rule) {
    if (rule.selector) {
        const {selector} = rule;
        const trim = selector.trim();
        if (
            trim.lastIndexOf(',')  === selector.length - 1 ||
            trim.lastIndexOf('\\') === selector.length - 1
        ) {
            this.push(rule, {
                identifier: SELECTOR,
                hack: selector,
            });
        }
    }
});
