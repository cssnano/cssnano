import {plugin} from 'postcss';
import has from 'has';
import browserslist from 'browserslist';
import {isSupported} from 'caniuse-api';
import fromInitial from '../data/fromInitial.json';
import toInitial from '../data/toInitial.json';

const initial = 'initial';

export default plugin('postcss-reduce-initial', () => {
    return (css, result) => {
        const resultOpts = result.opts || {};
        const browsers = browserslist(null, {
            stats: resultOpts.stats,
            path: __dirname,
            env: resultOpts.env,
        });
        const initialSupport = isSupported('css-initial-value', browsers);
        css.walkDecls(decl => {
            const prop = decl.prop.toLowerCase();
            const value = decl.value.toLowerCase();
            if (
                initialSupport &&
                has(toInitial, prop) &&
                value === toInitial[prop]
            ) {
                decl.prop = prop;
                decl.value = initial;
                return;
            }
            if (value !== initial || !fromInitial[prop]) {
                return;
            }
            decl.prop = prop;
            decl.value = fromInitial[prop];
        });
    };
});
