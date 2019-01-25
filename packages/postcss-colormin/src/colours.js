import color from 'color';
import keywords from './keywords.json';
import toShorthand from './lib/toShorthand';

const shorter = (a, b) => (a && a.length < b.length ? a : b).toLowerCase();

const coloursCache = {};

export default (colour, legacy = false) => {
    const key = colour + "|" + legacy;

    let cachedResult = coloursCache[key];

    if (cachedResult) {
        return cachedResult;
    }

    try {
        const parsed = color(colour.toLowerCase());
        const alpha  = parsed.alpha();

        if (alpha === 1) {
            const toHex = toShorthand(parsed.hex().toLowerCase());
            const result = shorter(keywords[toHex], toHex);

            coloursCache[key] = result;

            return result;
        } else {
            const rgb = parsed.rgb();

            if (
                !legacy &&
                !rgb.color[0] &&
                !rgb.color[1] &&
                !rgb.color[2] &&
                !alpha
            ) {
                const result = 'transparent';

                coloursCache[key] = result;

                return result;
            }

            let hsla = parsed.hsl().string();
            let rgba = rgb.string();
            let result = hsla.length < rgba.length ? hsla : rgba;

            coloursCache[key] = result;

            return result;
        }
    } catch (e) {
        // Possibly malformed, so pass through
        const result = colour;

        coloursCache[key] = result;

        return result;
    }
};
