import {plugin} from 'postcss';

function minimiseWhitespace (node) {
    if (node.type === 'decl') {
        // Ensure that !important values do not have any excess whitespace
        if (node.important) {
            node.raws.important = '!important';
        }
        // Remove whitespaces around ie 9 hack
        node.value = node.value.replace(/\s*(\\9)\s*/, '$1');
        // Remove extra semicolons and whitespace before the declaration
        if (node.raws.before) {
            const prev = node.prev();
            if (prev && prev.type !== 'rule') {
                node.raws.before = node.raws.before.replace(/;/g, '');
            }
            node.raws.before = node.raws.before.replace(/\s/g, '');
        }
        node.raws.between = ':';
        node.raws.semicolon = false;
    } else if (node.type === 'rule' || node.type === 'atrule') {
        node.raws.before = node.raws.between = node.raws.after = '';
        node.raws.semicolon = false;
    }
}

export default plugin('cssnano-core', () => {
    return css => {
        css.walk(minimiseWhitespace);
        // Remove final newline
        css.raws.after = '';
    };
});
