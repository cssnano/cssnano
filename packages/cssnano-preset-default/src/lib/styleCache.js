import {plugin} from 'postcss';

/*
 * Temporary hack for PostCSS 5.x.
 */

export default plugin('cssnano-style-cache', () => {
    return (css, result) => {
        result.root.rawCache = {
            colon:         ':',
            indent:        '',
            beforeDecl:    '',
            beforeRule:    '',
            beforeOpen:    '',
            beforeClose:   '',
            beforeComment: '',
            after:         '',
            emptyBody:     '',
            commentLeft:   '',
            commentRight:  '',
        };
    };
});
