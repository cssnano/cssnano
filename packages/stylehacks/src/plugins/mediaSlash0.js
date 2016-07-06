import plugin from '../plugin';

const targets = ['ie 8'];

export default plugin(targets, ['atrule'], function (rule) {
    const params = rule.params.trim();
    if (params === '\\0screen') {
        this.push(rule, {
            identifier: 'media query',
            hack: params,
        });
    }
});
