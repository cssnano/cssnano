import {plugin} from 'postcss';
import sort from 'alphanum-sort';
import uniqs from 'uniqs';

function unique (rule) {
    rule.selector = sort(uniqs(rule.selectors), {insensitive: true}).join();
}

export default plugin('postcss-unique-selectors', () => {
    return css => css.walkRules(unique);
});
