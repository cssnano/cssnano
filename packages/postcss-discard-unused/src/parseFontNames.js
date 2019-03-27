import valueParser from 'postcss-value-parser';

function normalizeFontName (fontName) {
    return fontName.toLowerCase().replace(/\\ /g, ' ');
}

function parseFontNames (node) {
    const parsed = valueParser(node.value);
    if (node.prop === 'font') {
        // The first property after the last unescaped/unquoted space is the font-family
        const lastSpaceIndex = parsed.nodes.reduce(
            (prev, {type}, i) => type === 'space' ? i : prev,
            -1
        );
        const fontFamilyNodes = parsed.nodes.slice(lastSpaceIndex + 1);
        return fontFamilyNodes
            .filter(({type}) => type === 'word' || type === 'string')
            .map(({value}) => normalizeFontName(value));
    }
    let joinPrev;
    return parsed.nodes
        .reduce((fonts, {type, value}) => {
            if (type === 'space') {
                joinPrev = true;
                fonts[fonts.length - 1] += value;
            } else if (type === 'word' || type === 'string') {
                if (joinPrev) {
                    fonts[fonts.length - 1] += normalizeFontName(value);
                    joinPrev = false;
                } else {
                    return [...fonts, normalizeFontName(value)];
                }
            }
            return fonts;
        }, []);
}

export default parseFontNames;
