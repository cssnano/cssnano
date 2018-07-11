import {plugin} from 'postcss';
import has from 'has';
import {isSupported} from 'caniuse-api';
import fromInitial from '../data/fromInitial.json';
import toInitial from '../data/toInitial.json';

const initial = 'initial';

export default plugin('postcss-reduce-initial', () => {
    return (css) => {
        const initialSupport = isSupported('css-initial-value');
        css.walkDecls(decl => {
            const lowerCasedProp = decl.prop.toLowerCase();
            if (
                initialSupport &&
                has(toInitial, lowerCasedProp) &&
                decl.value === toInitial[lowerCasedProp]
            ) {
                decl.value = initial;
                return;
            }
            if (decl.value.toLowerCase() !== initial || !fromInitial[lowerCasedProp]) {
                return;
            }
            decl.value = fromInitial[lowerCasedProp];
        });
    };
});
