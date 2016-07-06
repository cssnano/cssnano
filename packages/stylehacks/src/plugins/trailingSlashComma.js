import plugin from '../plugin';

const targets = ['ie 7', 'ie 6', 'ie 5.5'];

export default plugin(targets, ['rule'], function (rule) {
    if (rule.selector) {
        const {selector} = rule;
        const trim = selector.trim();
        if (
            trim.lastIndexOf(',')  === selector.length - 1 ||
            trim.lastIndexOf('\\') === selector.length - 1
        ) {
            this.push(rule, {
                identifier: 'selector',
                hack: selector,
            });
        }
    }
});
