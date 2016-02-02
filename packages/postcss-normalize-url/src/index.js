import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import normalize from 'normalize-url';
import isAbsolute from 'is-absolute-url';
import path from 'path';

const multiline = /\\[\r\n]/;
const escapeChars = /([\s\(\)"'])/g;

function convert (url, options) {
    if (isAbsolute(url) || !url.indexOf('//')) {
        return normalize(url, options);
    }
    return path.normalize(url).replace(new RegExp('\\' + path.sep, 'g'), '/');
}

function transformNamespace (rule, opts) {
    rule.params = valueParser(rule.params).walk(node => {
        if (node.type === 'function' && node.value === 'url' && node.nodes.length) {
            node.type = 'string';
            node.quote = node.nodes[0].quote || '"';
            node.value = node.nodes[0].value;
        }

        if (node.type === 'string') {
            node.value = convert(node.value.trim(), opts);
        }

        return false;
    }).toString();
}

function transformDecl (decl, opts) {
    decl.value = valueParser(decl.value).walk(node => {
        if (node.type !== 'function' || node.value !== 'url' || !node.nodes.length) {
            return false;
        }

        let url = node.nodes[0];
        let escaped;

        node.before = node.after = '';
        url.value = url.value.trim().replace(multiline, '');

        if (~url.value.indexOf('data:image/') || ~url.value.indexOf('data:application/') || ~url.value.indexOf('data:font/')) {
            return false;
        }

        if (!~url.value.indexOf('chrome-extension')) {
            url.value = convert(url.value, opts);
        }

        if (escapeChars.test(url.value)) {
            escaped = url.value.replace(escapeChars, '\\$1');
            if (escaped.length < url.value.length + (url.type === 'string' ? 2 : 0)) {
                url.value = escaped;
                url.type = 'word';
            }
        } else {
            url.type = 'word';
        }

        return false;
    }).toString();
}

module.exports = postcss.plugin('postcss-normalize-url', opts => {
    opts = {
        normalizeProtocol: false,
        stripFragment: false,
        stripWWW: true,
        ...opts
    };

    return css => {
        css.walk(node => {
            if (node.type === 'decl') {
                return transformDecl(node, opts);
            } else if (node.type === 'atrule' && node.name === 'namespace') {
                return transformNamespace(node, opts);
            }
        });
    };
});
