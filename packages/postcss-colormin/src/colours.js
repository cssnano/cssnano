import color from 'color';
import keywords from './keywords.json';
import toShorthand from './lib/toShorthand';
import trim from './lib/stripWhitespace';
import zero from './lib/trimLeadingZero';

const shorter = (a, b) => (a && a.length < b.length ? a : b).toLowerCase();

export default (colour, opts = {}) => {
    try {
        const parsed = color(colour.toLowerCase());
        const alpha  = parsed.alpha();
        if (alpha === 1) {
            const toHex = toShorthand(parsed.hex().toLowerCase());
            return shorter(keywords[toHex], toHex);
        } else {
            const rgb = parsed.rgb();
            if (
                !opts.legacy &&
                !rgb.color[0] &&
                !rgb.color[1] &&
                !rgb.color[2] &&
                !alpha
            ) {
                return 'transparent';
            }
            let hsla = parsed.hsl().round().string();
            let rgba = rgb.string();
            return zero(trim(hsla.length < rgba.length ? hsla : rgba));
        }
    } catch (e) {
        // Possibly malformed, so pass through
        return colour;
    }
};
