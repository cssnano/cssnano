import postcss from 'postcss';
import getParsed from './lib/getParsed';

// rules
import animation from './rules/animation';
import border from './rules/border';
import boxShadow from './rules/boxShadow';
import flexFlow from './rules/flexFlow';
import transition from './rules/transition';

/* eslint-disable quote-props */

const rules = {
    'animation':          animation,
    '-webkit-animation':  animation,
    'border':             border,
    'border-top':         border,
    'border-right':       border,
    'border-bottom':      border,
    'border-left':        border,
    'outline':            border,
    'box-shadow':         boxShadow,
    'flex-flow':          flexFlow,
    'transition':         transition,
    '-webkit-transition': transition,
};

/* eslint-enable */

function shouldAbort (parsed) {
    let abort = false;
    parsed.walk(({type, value}) => {
        if (
            type === 'comment' ||
            type === 'function' && value.toLowerCase() === 'var' ||
            type === 'word' && ~value.indexOf(`___CSS_LOADER_IMPORT___`)
        ) {
            abort = true;
            return false;
        }
    });
    return abort;
}

export default postcss.plugin('postcss-ordered-values', () => {
    return css => {
        css.walkDecls(decl => {
            const processor = rules[decl.prop.toLowerCase()];
            if (!processor) {
                return;
            }
            const parsed = getParsed(decl);
            if (parsed.nodes.length < 2 || shouldAbort(parsed)) {
                return;
            }
            processor(decl, parsed);
        });
    };
});
