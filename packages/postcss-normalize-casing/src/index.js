import postcss from 'postcss';

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
            } else if (decl.prop.toLowerCase() === 'background-image') {
                decl.prop = decl.prop.toLowerCase();
                return;
            }

            decl.prop = decl.prop.toLowerCase();
            decl.value = decl.value.toLowerCase();
        });
    };
});
