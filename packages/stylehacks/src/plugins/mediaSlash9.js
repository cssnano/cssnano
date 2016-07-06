import plugin from '../plugin';

const targets = ['ie 5.5', 'ie 6', 'ie 7'];

export default plugin(targets, ['atrule'], function (rule) {
    const params = rule.params.trim();
    if (params === 'screen\\9') {
        this.push(rule, {
            identifier: 'media query',
            hack: params,
        });
    }
});
