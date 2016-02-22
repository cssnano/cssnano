import plugin from '../plugin';

let targets = ['ie 7', 'ie 6', 'ie 5.5'];

export default plugin(targets, ['rule'], function (rule) {
    if (rule.selector) {
        const sel = rule.selector;
        const trim = sel.trim();
        if (
            trim.lastIndexOf(',')  === sel.length - 1 ||
            trim.lastIndexOf('\\') === sel.length - 1
        ) {
            this.push(rule, `Bad selector: ${sel}`);
        }
    }
});
