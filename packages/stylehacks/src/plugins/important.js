import plugin from '../plugin';

const targets = ['ie 5.5', 'ie 6', 'ie 7'];

export default plugin(targets, ['decl'], function (decl) {
    const match = decl.value.match(/!\w/);
    if (match) {
        const hack = decl.value.substr(match.index, decl.value.length - 1);
        this.push(decl, {
            identifier: '!important',
            hack,
        });
    }
});
