const wrapperUrl = new URL('./countingBrowserslist.js', import.meta.url).href;

// Redirects the bare 'browserslist' import of every plugin shim to a wrapper
// that counts calls. Subpaths such as 'browserslist/package.json' are not affected.
export async function resolve(specifier, context, next) {
  if (specifier === 'browserslist') {
    return { url: wrapperUrl, shortCircuit: true, format: 'module' };
  }
  return next(specifier, context);
}
