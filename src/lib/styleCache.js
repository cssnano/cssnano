import {plugin} from 'postcss';

export default plugin('cssnano-reset-stylecache', () => {
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
