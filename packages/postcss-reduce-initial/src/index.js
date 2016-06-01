import {plugin} from 'postcss';
import values from '../data/values.json';

export default plugin('postcss-reduce-initial', () => {
    return css => {
        css.walkDecls(decl => {
            if (decl.value !== 'initial') {
                return;
            }
            if (values[decl.prop]) {
                decl.value = values[decl.prop];
            }
        });
    };
});
