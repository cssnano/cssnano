/**
 * Records the raw formatting of the output on the root, for later plugins to
 * reuse.
 *
 * @param {import('postcss').Result} result
 * @return {void}
 */
export default function rawCache(result) {
  /** @type {import('postcss').Result & {root: {rawCache?: any}}} */ (
    result
  ).root.rawCache = {
    colon: ':',
    indent: '',
    beforeDecl: '',
    beforeRule: '',
    beforeOpen: '',
    beforeClose: '',
    beforeComment: '',
    after: '',
    emptyBody: '',
    commentLeft: '',
    commentRight: '',
  };
}
