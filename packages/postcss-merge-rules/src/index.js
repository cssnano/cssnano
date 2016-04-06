'use strict';

import postcss from 'postcss';
import clone from './lib/clone';

const list = postcss.list;
const prefixes = ['-webkit-', '-moz-', '-ms-', '-o-'];

function intersect (a, b, not) {
    return a.filter(c => {
        let index = ~b.indexOf(c);
        return not ? !index : index;
    });
}

let different = (a, b) => intersect(a, b, true).concat(intersect(b, a, true));
let filterPrefixes = selector => intersect(prefixes, selector);

function sameVendor (selectorsA, selectorsB) {
    let same = selectors => selectors.map(filterPrefixes).join();
    return same(selectorsA) === same(selectorsB);
}

let noVendor = selector => !filterPrefixes(selector).length;

function sameParent (ruleA, ruleB) {
    let hasParent = ruleA.parent && ruleB.parent;
    let sameType = hasParent && ruleA.parent.type === ruleB.parent.type;
    // If an at rule, ensure that the parameters are the same
    if (hasParent && ruleA.parent.type !== 'root' && ruleB.parent.type !== 'root') {
        sameType = sameType &&
                   ruleA.parent.params === ruleB.parent.params &&
                   ruleA.parent.name === ruleB.parent.name;
    }
    return hasParent ? sameType : true;
}

function canMerge (ruleA, ruleB) {
    let a = list.comma(ruleA.selector);
    let b = list.comma(ruleB.selector);

    let parent = sameParent(ruleA, ruleB);
    return parent && (a.concat(b).every(noVendor) || sameVendor(a, b));
}

let getDecls = rule => rule.nodes ? rule.nodes.map(String) : [];
let joinSelectors = (...rules) => rules.map(s => s.selector).join();

function ruleLength (...rules) {
    return rules.map(r => r.nodes.length ? String(r) : '').join('').length;
}

function isConflictingProp(propA, propB) {
    if (propA === propB) {
        return true;
    }
    let a = propA.split('-');
    let b = propB.split('-');
    return a.length !== b.length && a[0] === b[0];
}

function hasConflicts(declProp, notMoved) {
    return notMoved.some(prop => isConflictingProp(prop, declProp))
}

function partialMerge (first, second) {
    let intersection = intersect(getDecls(first), getDecls(second));
    if (!intersection.length) {
        return second;
    }
    let nextRule = second.next();
    if (nextRule && nextRule.type === 'rule' && canMerge(second, nextRule)) {
        let nextIntersection = intersect(getDecls(second), getDecls(nextRule));
        if (nextIntersection.length > intersection.length) {
            first = second; second = nextRule; intersection = nextIntersection;
        }
    }
    let recievingBlock = clone(second);
    recievingBlock.selector = joinSelectors(first, second);
    recievingBlock.nodes = [];
    second.parent.insertBefore(second, recievingBlock);
    let difference = different(getDecls(first), getDecls(second));
    let filterConflicts = (decls, intersection) => {
        let willMove = [];
        let willNotMove = [];
        decls.map(decl => {
            let intersects = ~intersection.indexOf(decl);
            let prop = decl.split(':')[0];
            let base = prop.split('-')[0];
            let canMove = difference.every(d => d.split(':')[0] !== base);
            if (intersects && canMove && !hasConflicts(prop, willNotMove)) {
                willMove.push(decl);
            } else {
                willNotMove.push(prop);
            }
        });
        return willMove;
    };
    intersection = filterConflicts(getDecls(first).reverse(), intersection);
    intersection = filterConflicts((getDecls(second)), intersection);
    let firstClone = clone(first);
    let secondClone = clone(second);
    let moveDecl = callback => {
        return decl => {
            if (~intersection.indexOf(String(decl))) {
                callback.call(this, decl);
            }
        };
    };
    firstClone.walkDecls(moveDecl(decl => {
        decl.remove();
        recievingBlock.append(decl);
    }));
    secondClone.walkDecls(moveDecl(decl => decl.remove()));
    let merged = ruleLength(firstClone, recievingBlock, secondClone);
    let original = ruleLength(first, second);
    if (merged < original) {
        first.replaceWith(firstClone);
        second.replaceWith(secondClone);
        [firstClone, recievingBlock, secondClone].forEach(r => {
            if (!r.nodes.length) {
                r.remove();
            }
        });
        if (!secondClone.parent) {
            return recievingBlock;
        }
        return secondClone;
    } else {
        recievingBlock.remove();
        return second;
    }
}

function selectorMerger () {
    let cache = null;
    return function (rule) {
        // Prime the cache with the first rule, or alternately ensure that it is
        // safe to merge both declarations before continuing
        if (!cache || !canMerge(rule, cache)) {
            cache = rule;
            return;
        }
        // Ensure that we don't deduplicate the same rule; this is sometimes
        // caused by a partial merge
        if (cache === rule) {
            cache = rule;
            return;
        }
        // Merge when declarations are exactly equal
        // e.g. h1 { color: red } h2 { color: red }
        if (getDecls(rule).join(';') === getDecls(cache).join(';')) {
            rule.selector = joinSelectors(cache, rule);
            cache.remove();
            cache = rule;
            return;
        }
        // Merge when both selectors are exactly equal
        // e.g. a { color: blue } a { font-weight: bold }
        if (cache.selector === rule.selector) {
            var toString = String(cache);
            rule.walk(decl => {
                if (~toString.indexOf(String(decl))) {
                    return decl.remove();
                }
                decl.moveTo(cache);
            });
            rule.remove();
            return;
        }
        // Partial merge: check if the rule contains a subset of the last; if
        // so create a joined selector with the subset, if smaller.
        cache = partialMerge(cache, rule);
    };
}

export default postcss.plugin('postcss-merge-rules', () => {
    return css => css.walkRules(selectorMerger());
});
