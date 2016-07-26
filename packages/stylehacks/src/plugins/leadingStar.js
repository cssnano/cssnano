import plugin from '../plugin';
import {IE_5_5, IE_6, IE_7} from '../dictionary/browsers';
import {PROPERTY} from '../dictionary/identifiers';
import {ATRULE, DECL} from '../dictionary/postcss';

const hacks = '!_$_&_*_)_=_%_+_,_._/_`_]_#_~_?_:_|'.split('_');

export default plugin([IE_5_5, IE_6, IE_7], [ATRULE, DECL], function (node) {
    if (node.type === DECL) {
        // some values are not picked up by before, so ensure they are
        // at the beginning of the value
        hacks.some(hack => {
            if (!node.prop.indexOf(hack)) {
                this.push(node, {
                    identifier: PROPERTY,
                    hack: node.prop,
                });
                return true;
            }
        });
        let {before} = node.raws;
        if (!before) {
            return;
        }
        hacks.some(hack => {
            if (~before.indexOf(hack)) {
                this.push(node, {
                    identifier: PROPERTY,
                    hack: `${before.trim()}${node.prop}`,
                });
                return true;
            }
        });
    } else if (node.type === ATRULE) {
        // test for the @property: value; hack
        let {name} = node;
        let len = name.length - 1;
        if (name.lastIndexOf(':') === len) {
            this.push(node, {
                identifier: PROPERTY,
                hack: `@${name.substr(0, len)}`,
            });
        }
    }
});
