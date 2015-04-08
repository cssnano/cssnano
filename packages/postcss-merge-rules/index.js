'use strict';

var postcss = require('postcss');
var list = postcss.list;
var flatten = require('flatten');

var prefixes = ['-webkit-', '-moz-', '-ms-', '-o-'];

function intersect (a, b) {
    return a.filter(function (c) {
        return ~b.indexOf(c);
    });
}

function different (a, b) {
    var ab = a.filter(function (c) {
        return !~b.indexOf(c);
    });

    var ba = b.filter(function (c) {
        return !~a.indexOf(c);
    });

    return ab.concat(ba);
}

function filterPrefixes (selector) {
    return intersect(prefixes, selector);
}

function sameVendor (selectorsA, selectorsB) {
    var same = function (selectors) {
        return flatten(selectors.map(filterPrefixes)).join();
    };
    return same(selectorsA) === same(selectorsB);
}

function noVendor (selector) {
    return !filterPrefixes(selector).length;
}

function sameParent (ruleA, ruleB) {
    var hasParent = ruleA.parent && ruleB.parent;
    var sameType = hasParent && ruleA.parent.type === ruleB.parent.type;
    // If an at rule, ensure that the parameters are the same
    if (hasParent && ruleA.parent.type !== 'root' && ruleB.parent.type !== 'root') {
        sameType = sameType && ruleA.parent.params === ruleB.parent.params;
    }
    return hasParent ? sameType : true;
}

function canMerge (ruleA, ruleB) {
    var a = list.comma(ruleA.selector);
    var b = list.comma(ruleB.selector);

    var parent = sameParent(ruleA, ruleB);
    return parent && (a.concat(b).every(noVendor) || sameVendor(a, b));
}

function getDeclarations (rule) {
    return rule.nodes.map(String);
}

function joinSelectors () {
    var selectors = Array.prototype.slice.call(arguments);
    selectors = selectors.map(function (s) { return s.selector; });
    return Array.prototype.concat.apply([], selectors).join(',');
}

function selectorMerger () {
    var cache = null;
    return function (rule) {
        // Prime the cache with the first rule, or alternately ensure that it is
        // safe to merge both declarations before continuing
        if (!cache || !canMerge(rule, cache)) {
            cache = rule;
            return;
        }
        var cacheDecls = getDeclarations(cache);
        var ruleDecls = getDeclarations(rule);
        // Merge when declarations are exactly equal
        // e.g. h1 { color: red } h2 { color: red }
        if (ruleDecls.join(';') === cacheDecls.join(';')) {
            rule.selector = joinSelectors(cache, rule);
            cache.removeSelf();
            cache = rule;
            return;
        }
        // Merge when both selectors are exactly equal
        // e.g. a { color: blue } a { font-weight: bold }
        if (cache.selector === rule.selector) {
            rule.eachInside(function (declaration) {
                declaration.moveTo(cache);
            });
            rule.removeSelf();
            return;
        }
        // Partial merge: check if the rule contains a subset of the last; if
        // so create a joined selector with the subset, if smaller.
        var intersection = intersect(cacheDecls, ruleDecls);
        if (intersection.length) {
            var decls = intersection.join(';');
            var merged = joinSelectors(cache, rule) + '{' + decls + '}';
            var shouldMerge = merged.length < (decls + decls).length;
            if (shouldMerge) {
                var difference = different(ruleDecls, cacheDecls);
                difference = difference.map(function (d) {
                    return d.split(':')[0].split('-')[0];
                });
                var recievingBlock = cache.cloneAfter({
                   selector: joinSelectors(cache, rule),
                   nodes: [],
                   before: ''
                });
                var moveDecl = function (callback) {
                    return function (decl) {
                        var intersects = ~intersection.indexOf('' + decl);
                        var baseProperty = decl.prop.split('-')[0];
                        var canMove = !~difference.indexOf(baseProperty);
                        if (intersects && (canMove || baseProperty === 'text')) {
                            callback.call(this, decl);
                        }
                    };
                };
                cache.eachInside(moveDecl(function (decl) {
                    decl.moveTo(recievingBlock);
                }));
                rule.eachInside(moveDecl(function (decl) {
                    decl.removeSelf();
                }));
                // Clean up any rules that have no declarations left
                [rule, recievingBlock, cache].forEach(function (r) {
                    if (!r.nodes.length) {
                        r.removeSelf();
                    }
                });
            }
        }

        cache = rule;
    };
}

module.exports = postcss.plugin('postcss-merge-rules', function () {
    return function (css) {
        css.eachRule(selectorMerger());
    };
});
