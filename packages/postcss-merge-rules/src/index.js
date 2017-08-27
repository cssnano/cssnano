import browserslist from 'browserslist';
import postcss from 'postcss';
import vendors from 'vendors';
import sameParent from 'lerna:cssnano-util-same-parent';
import ensureCompatibility from './lib/ensureCompatibility';

const prefixes = vendors.map(v => `-${v}-`);

function noop() { }

function splitProp (decl) {
    const parts = decl.prop.split('-');
    let base, rest;
    // Treat vendor prefixed properties as if they were unprefixed;
    // moving them when combined with non-prefixed properties can
    // cause issues. e.g. moving -webkit-background-clip when there
    // is a background shorthand definition.
    if (decl.prop[0] === '-') {
        base = parts[2];
        rest = parts.slice(3);
    } else {
        base = parts[0];
        rest = parts.slice(1);
    }
    return [base, rest];
}

function isConflictingProp (propA, propB) {
    if (propA.type != propB.type)
        return false;

    if (declsAreEqual(propA, propB))
        return true; 

    const a = splitProp(propA);
    const b = splitProp(propB);

    if (a[0] !== b[0])
        return false;

    if (a[1].length !== b[1].length)
        return true;

    const length = a[1].length - 1;
    const intersects = a[1].slice(0, length).every((part, i) => part === b[1][i]);

    if (!intersects)
        return true;

    if (a[1][length] !== b[1][length])
        return false;

    return propA.value !== propB.value;
}

function hasConflicts (decl, decls) {
    decls = decls.filter(x => x != decl);
    return decls.some(prop => isConflictingProp(prop, decl));
}

const filterPrefixes = selector => prefixes.filter(prefix => ~selector.indexOf(prefix))

function sameVendor (selectorsA, selectorsB) {
    let same = selectors => selectors.map(filterPrefixes).join();
    return same(selectorsA) === same(selectorsB);
}

const noVendor = selector => !filterPrefixes(selector).length;

function canMerge (ruleA, ruleB, browsers, compatibilityCache) {
    const a = ruleA.selectors;
    const b = ruleB.selectors;

    const selectors = a.concat(b);

    if (!ensureCompatibility(selectors, browsers, compatibilityCache)) {
        return false;
    }

    const parent = sameParent(ruleA, ruleB);
    const {name} = ruleA.parent;
    if (parent && name && ~name.indexOf('keyframes')) {
        return false;
    }
    return parent && (selectors.every(noVendor) || sameVendor(a, b));
}

function trimValue (value) {
    return value ? value.trim() : value;
}

function declsAreEqual (a, b) {
    if (a.type !== b.type || a.type !== 'decl')
        return false;

    if (a.prop !== b.prop || a.value !== b.value)
        return false;

    if (a.raws && trimValue(a.raws.before) !== trimValue(b.raws.before))
        return false;
    
    return true;
}

function ruleNodesAreEqual (a, b) {
    if (a.nodes.length !== b.nodes.length) 
        return false;

    return a.nodes.every((decl, i) => declsAreEqual(decl, b.nodes[i]));
}

const joinSelectors = (...rules) => rules.map(s => s.selector).join();

function difference (a, b) {
    return a.filter(x => !~b.indexOf(x))
}

function intersect (nodesA, nodesB) {
    if (!nodesA || !nodesB || !nodesA.length || !nodesB.length)
        return [];

    let nodes = nodesA.filter(a => {
        let nodes = nodesB.filter(b => declsAreEqual(a, b));
        let diff = difference(nodesB, nodes);
        return nodes.length && nodes.every(d => !hasConflicts(d, diff));
    });
    let diff = difference(nodesA, nodes);
    return nodes.length && nodes.filter(decl => !hasConflicts(decl, diff));    
}

function ruleLength (rule, ignore = []) {
    let nodes = rule.nodes.filter(d => !~ignore.indexOf(d) && d.type === 'decl');
    if (!nodes.length)
        return 0;

    let length = rule.selector.length + 2;
    for (let node of nodes) {
        length += node.prop.length + node.value.length + 2;
    }

    return length;
}

function selectorMerger (browsers, compatibilityCache) {
    function partialMerge (rule, prev) {
        let intersection = intersect(rule.nodes, prev.nodes);

        if (!intersection.length)
            return;

        const origLength = ruleLength(prev) + ruleLength(rule);

        const newRule = rule.clone();
        newRule.selector = joinSelectors(prev, rule);
        newRule.nodes = [];

        intersection = intersect(prev.nodes, intersection).concat(intersection);
        
        intersection.forEach(decl => {
            var alreadyExists = newRule.nodes.some(node => declsAreEqual(node, decl));
            if (alreadyExists)
                return;

            newRule.append(decl.clone());
        });

        const newLength = ruleLength(prev, intersection) + ruleLength(newRule) + ruleLength(rule, intersection);
        
        if (newLength < origLength) {
            intersection.forEach(decl => decl.remove());
            prev.after(newRule);
            
            const prevNode = prev.prev();
            if (prevNode && prevNode.type === 'rule')
                partialMerge(newRule, prevNode);

            if (!rule.nodes.length)
                rule.remove();

            if (!prev.nodes.length)
                prev.remove();
        }
    }

    function handleRule (rule) {
        const index = rule.parent.nodes.indexOf(rule);
        const prev = rule.parent.nodes[index - 1];
        walkChildren(rule);
        
        if (!prev || prev.type !== 'rule')
            return;

        if (!canMerge(rule, prev, browsers, compatibilityCache))
            return;

        // Merge when declarations are exactly equal
        // e.g. h1 { color: red } h2 { color: red }
        if (ruleNodesAreEqual(rule, prev)) {
            prev.selector = joinSelectors(prev, rule);
            rule.remove();
            return;
        }

        // Merge when both selectors are exactly equal
        // e.g. a { color: blue } a { font-weight: bold }
        if (rule.selector === prev.selector) {
            rule.walk(decl => {
                var containsDecl = prev.nodes.some(d => declsAreEqual(decl, d));
                if (containsDecl)
                    return;

                prev.append(decl);
            });

            rule.remove();
            return;
        }
        
        partialMerge(rule, prev);
    }

    const handler = {
        rule: handleRule,
        atrule: walkChildren,
        decl: noop,
        comment: noop
    };

    function walkChildren (root) {
        if (!root.nodes || !root.nodes.length)
            return;

        let index = root.nodes.length;
        while (index-- > 0) {
            const lastNode = root.nodes[index];
            const nodeCount = root.nodes.length;

            if (lastNode && lastNode.type)
                handler[lastNode.type](lastNode);

            const offset = root.nodes.length - nodeCount;
            if (offset > 0) 
                index += offset;
        }
    }

    return walkChildren;
}

export default postcss.plugin('postcss-merge-rules', () => {
    return (css, result) => {
        const resultOpts = result.opts || {};
        const browsers = browserslist(null, {
            stats: resultOpts.stats,
            path: __dirname,
            env: resultOpts.env,
        });
        const compatibilityCache = {};
        const mergeRules = selectorMerger(browsers, compatibilityCache);
        mergeRules(css);
    };
});
