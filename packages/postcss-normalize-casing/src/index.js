import postcss from 'postcss';

function ignoreValueCasing (prop, value) {
    if (
      prop === 'background-image' ||
      prop.match(/animation/gi) ||
      prop.match(/font-family/gi) ||
      prop === 'font' ||
      prop === 'content' ||
      prop === 'src' ||
      prop === 'filter' && value.toLowerCase().match(/progid/gi) ||
      prop.match(/transform/gi) && value.toLowerCase().match(/translate|scale|rotate/gi) ||
      prop.toLowerCase() === 'text-rendering' && value.toLowerCase() === 'optimizelegibility' ||
      value.match(/currentColor/gi) ||
      value.match(/ButtonText/gi)
    ) {
        return true;
    }
    return false;
}

export default postcss.plugin('postcss-normalize-casing', () => {
    return css => {
        return css.walkDecls((decl) => {
            if (decl.type !== 'decl') {
                return;
            }

            if (decl.prop.toLowerCase() === 'background') {
                if (decl.value.toLowerCase().indexOf('url') >= 0) {
                    decl.prop = decl.prop.toLowerCase();
                    const [value, urlValue, restValue] = /(url\(.+\))+(.*)/gi.exec(decl.value);
                    if (urlValue && restValue) {
                        decl.value = `${urlValue.trim()} ${restValue.toLowerCase().trim()}`;
                        return;
                    }
                    decl.value = value;
                    return;
                }
            } else if (ignoreValueCasing(decl.prop.toLowerCase(), decl.value)) {
                decl.prop = decl.prop.toLowerCase();
                return;
            }

            decl.prop = decl.prop.toLowerCase();
            decl.value = decl.value.toLowerCase();
        });
    };
});
