import valueParser from 'postcss-value-parser';
import { optimize } from 'svgo';
import { encode, decode } from './lib/url';

const PLUGIN = 'postcss-svgo';
const dataURI = /data:image\/svg\+xml(;((charset=)?utf-8|base64))?,/i;
const dataURIBase64 = /data:image\/svg\+xml;base64,/i;

function minify(decl, opts, postcssResult) {
  const parsed = valueParser(decl.value);

  decl.value = parsed.walk((node) => {
    if (
      node.type !== 'function' ||
      node.value.toLowerCase() !== 'url' ||
      !node.nodes.length
    ) {
      return;
    }

    let { value, quote } = node.nodes[0];
    let isBase64, isUriEncoded;
    const url = new URL(value);
    let svg = value.replace(dataURI, '');

    if (dataURIBase64.test(value)) {
      let base64String = `${url.protocol}${url.pathname}`.replace(dataURI, '');
      svg = Buffer.from(base64String, 'base64').toString('utf8');
      isBase64 = true;
    } else {
      if (!dataURI.test(value)) {
        return;
      }
      let decodedUri;

      try {
        decodedUri = decode(svg);
        isUriEncoded = decodedUri !== svg;
      } catch (e) {
        // Swallow exception if we cannot decode the value
        isUriEncoded = false;
      }

      if (isUriEncoded) {
        svg = decodedUri;
      }

      if (opts.encode !== undefined) {
        isUriEncoded = opts.encode;
      }
    }

    let result;
    try {
      result = optimize(svg, opts);
      if (result.error) {
        decl.warn(postcssResult, `${result.error}`);
        return;
      }
    } catch (error) {
      decl.warn(postcssResult, `${error}`);
      return;
    }
    let data, optimizedValue;

    if (isBase64) {
      data = Buffer.from(result.data).toString('base64');
      optimizedValue = 'data:image/svg+xml;base64,' + data + url.hash;
    } else {
      data = isUriEncoded ? encode(result.data) : result.data;
      // Should always encode # otherwise we yield a broken SVG
      // in Firefox (works in Chrome however). See this issue:
      // https://github.com/cssnano/cssnano/issues/245
      data = data.replace(/#/g, '%23');
      optimizedValue = 'data:image/svg+xml;charset=utf-8,' + data;
      quote = isUriEncoded ? '"' : "'";
    }

    node.nodes[0] = Object.assign({}, node.nodes[0], {
      value: optimizedValue,
      quote: quote,
      type: 'string',
      before: '',
      after: '',
    });

    return false;
  });

  decl.value = decl.value.toString();
}

function pluginCreator(opts = {}) {
  return {
    postcssPlugin: PLUGIN,

    OnceExit(css, { result }) {
      css.walkDecls((decl) => {
        if (!dataURI.test(decl.value)) {
          return;
        }

        minify(decl, opts, result);
      });
    },
  };
}

pluginCreator.postcss = true;
export default pluginCreator;
