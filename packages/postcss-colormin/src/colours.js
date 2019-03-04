import color from 'color';
import keywords from './keywords.json';
import toShorthand from './lib/toShorthand';

const shorter = (a, b) => (a && a.length < b.length ? a : b).toLowerCase();

export default (colour, isLegacy = true, cache = false) => {
    const key = colour + "|" + isLegacy;

    if (cache && cache[key]) {
        return cache[key];
    }

    try {
        const parsed = color(colour.toLowerCase());
        const alpha  = parsed.alpha();

        if (alpha === 1) {
            const toHex = toShorthand(parsed.hex().toLowerCase());
            const result = shorter(keywords[toHex], toHex);

            if (cache) {
                cache[key] = result;
            }

            return result;
        } else {
            const rgb = parsed.rgb();

            if (
                colour.toLowerCase() === "transparent" &&
                !rgb.color[0] &&
                !rgb.color[1] &&
                !rgb.color[2] &&
                !alpha
            ) {
                const result = 'transparent';

                if (cache) {
                    cache[key] = result;
                }

                return result;
            }

            let hsla = parsed.hsl().string();
            let rgba = rgb.string();
            let result = hsla.length < rgba.length ? hsla : rgba;

            if (cache) {
                cache[key] = result;
            }

            return result;
        }
    } catch (e) {
        // Possibly malformed, so pass through
        const result = colour;

        if (cache) {
            cache[key] = result;
        }

        return result;
    }
};
