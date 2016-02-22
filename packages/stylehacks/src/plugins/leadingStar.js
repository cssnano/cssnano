import plugin from '../plugin';

let targets = ['ie 5.5', 'ie 6', 'ie 7'];

export default plugin(targets, ['decl', 'atrule'], function (node) {
    if (node.type === 'decl') {
        let before = node.raws.before;
        if (!before) {
            return;
        }
        let hacks = '!_$_&_*_)_=_%_+_,_._/_`_]_#_~_?_:_|'.split('_');
        let hasBefore = hacks.some(hack => {
            if (~before.indexOf(hack)) {
                this.push(node, `Bad property: ${before.trim()}${node.prop}`);
                return true;
            }
        });
        if (!hasBefore) {
            // some values are not picked up by before, so ensure they are
            // at the beginning of the value
            hacks.some(hack => {
                if (!node.prop.indexOf(hack)) {
                    this.push(node, `Bad property: ${node.prop}`);
                    return true;
                }
            });
        }
    }
    if (node.type === 'atrule') {
        // test for the @property: value; hack
        let name = node.name;
        let len = name.length - 1;
        if (name.lastIndexOf(':') === len) {
            this.push(node, `Bad property: @${name.substr(0, len)}`);
        }
    }
});
