import plugin from '../plugin';

const targets = ['ie 5.5', 'ie 6', 'ie 7'];
const hacks = '!_$_&_*_)_=_%_+_,_._/_`_]_#_~_?_:_|'.split('_');

export default plugin(targets, ['decl', 'atrule'], function (node) {
    if (node.type === 'decl') {
        // some values are not picked up by before, so ensure they are
        // at the beginning of the value
        hacks.some(hack => {
            if (!node.prop.indexOf(hack)) {
                this.push(node, {
                    identifier: 'property',
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
                    identifier: 'property',
                    hack: `${before.trim()}${node.prop}`,
                });
                return true;
            }
        });
    } else if (node.type === 'atrule') {
        // test for the @property: value; hack
        let {name} = node;
        let len = name.length - 1;
        if (name.lastIndexOf(':') === len) {
            this.push(node, {
                identifier: 'property',
                hack: `@${name.substr(0, len)}`,
            });
        }
    }
});
