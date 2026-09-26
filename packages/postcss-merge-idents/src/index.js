import { TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from 'cssnano-utils';
import specData from './data/mergeIdents.json' with { type: 'json' };

const { applyEdits, asciiLowerCase, decoded, tokens } = cssnanoUtils;

const VENDOR_PREFIX = /^-(webkit|moz|o)-/v;

const CSS_WIDE_KEYWORDS = new Set(specData.cssWideKeywords);

const KEYFRAMES_NAME_RESERVED = new Set([
  ...CSS_WIDE_KEYWORDS,
  'default',
  'none',
]);

// css-animations-2 spells <single-animation-composition> only in the
// animation-composition property grammar; the shorthand grammar webref gives
// does not reach it yet, so these keywords stay hand-written.
const ANIMATION_COMPOSITION_KEYWORDS = new Set([
  'accumulate',
  'add',
  'replace',
]);

const KEYFRAMES_SHORTHAND_KEYWORDS = new Set([
  ...CSS_WIDE_KEYWORDS,
  ...specData.keyframes.shorthandKeywords,
  ...ANIMATION_COMPOSITION_KEYWORDS,
]);

const COUNTER_STYLE_NAME_RESERVED = new Set([
  ...CSS_WIDE_KEYWORDS,
  'default',
  'decimal',
  'none',
]);

// The predefined counter style names are specified in prose (CSS Counter
// Styles Level 3 §6) rather than in any grammar, so webref cannot list them.
const PREDEFINED_COUNTER_STYLES = [
  'arabic-indic',
  'armenian',
  'bengali',
  'cambodian',
  'circle',
  'cjk-decimal',
  'cjk-earthly-branch',
  'cjk-heavenly-stem',
  'cjk-ideographic',
  'decimal',
  'decimal-leading-zero',
  'devanagari',
  'disc',
  'disclosure-closed',
  'disclosure-open',
  'ethiopic-numeric',
  'georgian',
  'gujarati',
  'gurmukhi',
  'hebrew',
  'hiragana',
  'hiragana-iroha',
  'japanese-formal',
  'japanese-informal',
  'kannada',
  'katakana',
  'katakana-iroha',
  'khmer',
  'korean-hangul-formal',
  'korean-hanja-formal',
  'korean-hanja-informal',
  'lao',
  'lower-alpha',
  'lower-armenian',
  'lower-greek',
  'lower-latin',
  'lower-roman',
  'malayalam',
  'mongolian',
  'myanmar',
  'oriya',
  'persian',
  'simp-chinese-formal',
  'simp-chinese-informal',
  'square',
  'tamil',
  'telugu',
  'thai',
  'tibetan',
  'trad-chinese-formal',
  'trad-chinese-informal',
  'upper-alpha',
  'upper-armenian',
  'upper-latin',
  'upper-roman',
];

const COUNTER_STYLE_RESERVED = new Set([
  ...CSS_WIDE_KEYWORDS,
  ...specData.counterStyle.keywords,
  ...PREDEFINED_COUNTER_STYLES,
]);

const COUNTER_STYLE_FUNCTIONS = new Map(
  Object.entries(specData.counterStyle.functions).map(([name, args]) => [
    // Stylesheets spell a function without the trailing `()` webref names it
    // by, preserving the historical lookup behavior.
    name.slice(0, -2),
    args,
  ])
);

const CONDITIONAL_GROUP_RULES = new Set([
  'media',
  'supports',
  'container',
  'document',
]);

/**
 * @param {string} name
 * @return {boolean}
 */
function isConditionalGroupRule(name) {
  const lower = asciiLowerCase(name);
  return CONDITIONAL_GROUP_RULES.has(lower) || lower.endsWith('document');
}

/**
 * @param {string} params
 * @param {string} atRuleName
 * @return {{ isString: boolean, isReservedName: boolean, key: string, tokenText: string } | null}
 */
function parseAtRuleName(params, atRuleName) {
  const trimmed = params.trim();
  if (!trimmed) {
    return null;
  }
  const tokenList = tokens(trimmed).filter(
    (t) => t[0] !== TokenType.Whitespace && t[0] !== TokenType.Comment
  );
  if (tokenList.length !== 1) {
    return null;
  }
  const isCounterStyle = atRuleName.endsWith('counter-style');
  const first = tokenList[0];
  if (first[0] === TokenType.Ident) {
    const val = decoded(first);
    const lower = asciiLowerCase(val);
    const isReserved = isCounterStyle
      ? COUNTER_STYLE_NAME_RESERVED.has(lower)
      : KEYFRAMES_NAME_RESERVED.has(lower);
    if (isReserved) {
      return null;
    }
    const isReservedName = isCounterStyle
      ? COUNTER_STYLE_RESERVED.has(lower)
      : KEYFRAMES_SHORTHAND_KEYWORDS.has(lower) || val.startsWith('--');
    return {
      isString: false,
      isReservedName,
      key: `ident:${val}`,
      tokenText: first[1],
    };
  }
  if (!isCounterStyle && first[0] === TokenType.String) {
    const val = /** @type {{value: string}} */ (first[4]).value;
    return {
      isString: true,
      isReservedName: false,
      key: `str:${val}`,
      tokenText: first[1],
    };
  }
  return null;
}

/**
 * @param {import('postcss').Declaration} decl
 * @return {{ targetAtRuleName: string, kind: 'animation-shorthand' | 'animation-name' | 'counter-style' | 'counter-style-func' } | null}
 */
function classifyDeclaration(decl) {
  const prop = asciiLowerCase(decl.prop);
  if (prop.startsWith('--')) {
    return null;
  }

  const prefixMatch = prop.match(VENDOR_PREFIX);
  const prefix = prefixMatch ? prefixMatch[0] : '';
  const unprefixed = prefix ? prop.slice(prefix.length) : prop;

  if (unprefixed === 'animation') {
    return {
      targetAtRuleName: `${prefix}keyframes`,
      kind: 'animation-shorthand',
    };
  }
  if (unprefixed === 'animation-name') {
    return { targetAtRuleName: `${prefix}keyframes`, kind: 'animation-name' };
  }
  if (unprefixed === 'list-style' || unprefixed === 'list-style-type') {
    return { targetAtRuleName: 'counter-style', kind: 'counter-style' };
  }

  if (
    decl.parent?.type === 'atrule' &&
    asciiLowerCase(decl.parent.name).endsWith('counter-style')
  ) {
    if (prop === 'system' || prop === 'fallback' || prop === 'speak-as') {
      return {
        targetAtRuleName: asciiLowerCase(decl.parent.name),
        kind: 'counter-style',
      };
    }
  }

  if (
    unprefixed === 'content' ||
    unprefixed === 'bookmark-label' ||
    unprefixed === 'copy-into' ||
    unprefixed === 'string-set'
  ) {
    return { targetAtRuleName: 'counter-style', kind: 'counter-style-func' };
  }

  return null;
}

/**
 * @param {import('postcss').Node} node
 * @return {import('postcss').Container}
 */
function getContainer(node) {
  let curr = node.parent;
  while (curr && curr.type !== 'root') {
    if (
      curr.type === 'atrule' &&
      isConditionalGroupRule(
        /** @type {import('postcss').AtRule} */ (curr).name
      )
    ) {
      return curr;
    }
    curr = curr.parent;
  }
  return curr ?? node.root();
}

/**
 * @param {{ rule: import('postcss').AtRule, body?: string }} entry
 * @return {string}
 */
function getBody(entry) {
  if (entry.body === undefined) {
    entry.body = entry.rule.nodes ? entry.rule.nodes.toString() : '';
  }
  return entry.body;
}

/**
 * Creates one source edit replacing a token with new text. A hex escape
 * consumes the whitespace that terminates it, so the raw text of e.g. `\61 `
 * ends with that separator space; `end` includes it and the replacement must
 * give the space back to keep the following token separated.
 *
 * @param {import('@csstools/css-tokenizer').CSSToken} token
 * @param {string} rep
 * @return {{ start: number, end: number, text: string }}
 */
function createTokenEdit(token, rep) {
  const text = token[1].endsWith(' ') ? `${rep} ` : rep;
  return { start: token[2], end: token[3] + 1, text };
}

/**
 * Parses a @layer parameter list into decoded layer-name paths. A period is a
 * separator only as a Delim token between idents; an escaped dot is part of
 * the preceding identifier's value, so `a\.b` is one segment named "a.b".
 * Whitespace and comments around separators are allowed, preserving the
 * previous handling of `a . b`.
 *
 * @param {string} params
 * @return {string[][] | null} one decoded segment path per declared name
 */
function parseLayerNameList(params) {
  const tokenList = tokens(params).filter(
    (t) => t[0] !== TokenType.Whitespace && t[0] !== TokenType.Comment
  );
  /** @type {string[][]} */
  const names = [];
  /** @type {string[] | null} */
  let current = null;
  let expectIdent = true;
  for (const token of tokenList) {
    const type = token[0];
    if (type === TokenType.Comma) {
      if (expectIdent || !current) {
        return null;
      }
      names.push(current);
      current = null;
      expectIdent = true;
    } else if (type === TokenType.Delim && token[1] === '.') {
      if (expectIdent || !current) {
        return null;
      }
      expectIdent = true;
    } else if (type === TokenType.Ident && expectIdent) {
      current ??= [];
      current.push(decoded(token));
      expectIdent = false;
    } else {
      return null;
    }
  }
  if (expectIdent) {
    return null;
  }
  if (current) {
    names.push(current);
  }
  return names;
}

/**
 * @param {import('postcss').Node} node
 * @return {import('postcss').AtRule[]} enclosing @layer at-rules, outermost first
 */
function enclosingLayerRules(node) {
  /** @type {import('postcss').AtRule[]} */
  const chain = [];
  let curr = node.parent;
  while (curr && curr.type !== 'root') {
    if (
      curr.type === 'atrule' &&
      asciiLowerCase(/** @type {import('postcss').AtRule} */ (curr).name) ===
        'layer'
    ) {
      chain.unshift(/** @type {import('postcss').AtRule} */ (curr));
    }
    curr = curr.parent;
  }
  return chain;
}

class LayerRegistry {
  constructor() {
    this.nextIndex = 0;
    /** @type {Map<string, { index: number, children: LayerRegistry }>} */
    this.layers = new Map();
    /** @type {Map<import('postcss').AtRule, { index: number, children: LayerRegistry }>} */
    this.anonymous = new Map();
  }

  /**
   * @param {string} name
   * @return {{ index: number, children: LayerRegistry }}
   */
  getOrCreate(name) {
    let entry = this.layers.get(name);
    if (!entry) {
      entry = { index: this.nextIndex++, children: new LayerRegistry() };
      this.layers.set(name, entry);
    }
    return entry;
  }

  /**
   * Entry for a layer with no name or an unparseable name: every occurrence
   * is a unique cascade layer, but names nested inside still order beneath
   * it through the child registry.
   *
   * @param {import('postcss').AtRule} layerRule
   * @return {{ index: number, children: LayerRegistry }}
   */
  getOrCreateAnonymous(layerRule) {
    let entry = this.anonymous.get(layerRule);
    if (!entry) {
      entry = { index: this.nextIndex++, children: new LayerRegistry() };
      this.anonymous.set(layerRule, entry);
    }
    return entry;
  }

  /**
   * The registry entry a single layer at-rule occupies, creating missing
   * segments as needed. Statement lists and unparseable names fall back to a
   * unique anonymous entry so they order but never match another spelling.
   *
   * @param {import('postcss').AtRule} layerRule
   * @return {{ index: number, children: LayerRegistry }}
   */
  entryFor(layerRule) {
    const names = layerRule.params.trim()
      ? parseLayerNameList(layerRule.params)
      : null;
    if (names === null || names.length !== 1) {
      return this.getOrCreateAnonymous(layerRule);
    }
    let entry = this.getOrCreate(names[0][0]);
    for (let i = 1; i < names[0].length; i++) {
      entry = entry.children.getOrCreate(names[0][i]);
    }
    return entry;
  }

  /**
   * Registers the layers a @layer at-rule declares, in document order and
   * nested beneath any enclosing layers, so later lookups observe the real
   * layer tree.
   *
   * @param {import('postcss').AtRule} layerRule
   * @return {void}
   */
  declareLayerAtRule(layerRule) {
    /** @type {LayerRegistry} */
    let current = this;
    for (const parent of enclosingLayerRules(layerRule)) {
      current = current.entryFor(parent).children;
    }
    if (!layerRule.params.trim()) {
      // An unnamed block layer is itself a unique anonymous layer; register
      // it so nested names order beneath it.
      if (layerRule.nodes) {
        current.getOrCreateAnonymous(layerRule);
      }
      return;
    }
    const names = parseLayerNameList(layerRule.params);
    if (names === null) {
      return;
    }
    for (const segments of names) {
      let entry = current.getOrCreate(segments[0]);
      for (let i = 1; i < segments.length; i++) {
        entry = entry.children.getOrCreate(segments[i]);
      }
    }
  }

  /**
   * @param {import('postcss').Node} node
   * @return {number[]}
   */
  getPriority(node) {
    const chain = enclosingLayerRules(node);
    if (chain.length === 0) {
      return [Infinity];
    }

    /** @type {number[]} */
    const priority = [];
    /** @type {LayerRegistry} */
    let current = this;
    for (const layerRule of chain) {
      const entry = current.entryFor(layerRule);
      priority.push(entry.index);
      current = entry.children;
    }
    priority.push(Infinity);
    return priority;
  }
}

/**
 * @param {number[]} p1
 * @param {number[]} p2
 * @return {number}
 */
function compareLayerPriority(p1, p2) {
  const len = Math.min(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    if (p1[i] !== p2[i]) {
      return p1[i] - p2[i];
    }
  }
  return p1.length - p2.length;
}

/**
 * @param {{ layerPriority: number[], documentIndex: number }} a
 * @param {{ layerPriority: number[], documentIndex: number }} b
 * @return {number}
 */
function compareAtRulePriority(a, b) {
  const layerCmp = compareLayerPriority(a.layerPriority, b.layerPriority);
  if (layerCmp !== 0) {
    return layerCmp;
  }
  return a.documentIndex - b.documentIndex;
}

/**
 * @typedef {{
 *   rule: import('postcss').AtRule,
 *   body?: string,
 *   layerPriority: number[],
 *   documentIndex: number,
 *   parsed: { isString: boolean, isReservedName: boolean, key: string, tokenText: string }
 * }} AtRuleEntry
 *
 * @typedef {{
 *   entries: AtRuleEntry[],
 *   resolver?: (key: string) => { text: string, key: string } | undefined,
 *   definedNames?: Set<string>
 * }} FamilyRecord
 */

/**
 * @param {AtRuleEntry[]} entries
 * @param {Set<import('postcss').AtRule>} removals
 * @return {{ resolver: (key: string) => { text: string, key: string } | undefined, definedNames: Set<string>, hasReplacements: boolean }}
 */
function processAtRuleEntries(entries, removals) {
  const definedNames = new Set();
  if (entries.length === 0) {
    return {
      resolver: () => undefined,
      definedNames,
      hasReplacements: false,
    };
  }

  for (const entry of entries) {
    definedNames.add(entry.parsed.key);
  }

  if (entries.length === 1) {
    return {
      resolver: () => undefined,
      definedNames,
      hasReplacements: false,
    };
  }

  /** @type {Map<string, AtRuleEntry[]>} */
  const byName = new Map();
  for (const entry of entries) {
    let nameList = byName.get(entry.parsed.key);
    if (!nameList) {
      nameList = [];
      byName.set(entry.parsed.key, nameList);
    }
    nameList.push(entry);
  }

  const eligible = collectEligibleEntries(byName, removals);

  /** @type {Map<string, AtRuleEntry[]>} */
  const groupsByBody = new Map();

  for (const item of eligible) {
    const groupKey = (item.parsed.isString ? 's:' : 'i:') + getBody(item);
    let group = groupsByBody.get(groupKey);
    if (!group) {
      group = [];
      groupsByBody.set(groupKey, group);
    }
    group.push(item);
  }

  /** @type {Map<string, { text: string, key: string }>} */
  const resolved = new Map();

  for (const group of groupsByBody.values()) {
    if (group.length > 1) {
      let survivor = group[0];
      for (let i = 1; i < group.length; i++) {
        if (compareAtRulePriority(survivor, group[i]) < 0) {
          survivor = group[i];
        }
      }
      for (const item of group) {
        if (item !== survivor) {
          removals.add(item.rule);
          resolved.set(item.parsed.key, {
            text: survivor.parsed.tokenText,
            key: survivor.parsed.key,
          });
        }
      }
    }
  }

  return {
    resolver: (key) => resolved.get(key),
    definedNames,
    hasReplacements: resolved.size > 0,
  };
}

/**
 * Collects the entries that may join a cross-name merge group: repeat
 * definitions of one name collapse to their highest priority copy first, and
 * only when all copies share a body. Reserved names never merge because a
 * stylesheet that spells one is not free to take another spelling.
 *
 * @param {Map<string, AtRuleEntry[]>} byName
 * @param {Set<import('postcss').AtRule>} removals
 * @return {AtRuleEntry[]}
 */
function collectEligibleEntries(byName, removals) {
  /** @type {AtRuleEntry[]} */
  const eligible = [];

  for (const list of byName.values()) {
    if (list.length === 1) {
      if (!list[0].parsed.isReservedName) {
        eligible.push(list[0]);
      }
      continue;
    }
    const firstBody = getBody(list[0]);
    if (!list.every((item) => getBody(item) === firstBody)) {
      continue;
    }
    let survivor = list[0];
    for (let i = 1; i < list.length; i++) {
      if (compareAtRulePriority(survivor, list[i]) < 0) {
        survivor = list[i];
      }
    }
    for (const item of list) {
      if (item !== survivor) {
        removals.add(item.rule);
      }
    }
    if (!survivor.parsed.isReservedName) {
      eligible.push(survivor);
    }
  }

  return eligible;
}

/**
 * @param {Map<import('postcss').Container, Map<string, FamilyRecord>>} scopes
 * @param {import('postcss').Container} container
 * @param {string} targetAtRuleName
 * @param {string} tokenKey
 * @return {string | undefined}
 */
function lookupScopeChain(scopes, container, targetAtRuleName, tokenKey) {
  let curr = container;
  /** @type {Array<Set<string>>} */
  const intermediateDefinedNames = [];

  while (curr) {
    const containerScope = scopes.get(curr);
    const atRuleData = containerScope?.get(targetAtRuleName);
    if (atRuleData) {
      const replacement = atRuleData.resolver?.(tokenKey);
      if (replacement !== undefined) {
        for (const intermediate of intermediateDefinedNames) {
          if (intermediate.has(replacement.key)) {
            return undefined;
          }
        }
        return replacement.text;
      }
      if (atRuleData.definedNames?.has(tokenKey)) {
        return undefined;
      }
      if (atRuleData.definedNames) {
        intermediateDefinedNames.push(atRuleData.definedNames);
      }
    }
    if (curr.type === 'root') {
      break;
    }
    curr = getContainer(curr);
  }
  return undefined;
}

/**
 * @typedef {{ expectedArgs?: number[], argIndex: number, close: TokenType }} NestingFrame
 */

/**
 * Shared walk over a declaration value: tracks function, bracket, and block
 * nesting, and hands each remaining token to the visitor together with the
 * innermost frame. Top-level tokens receive no frame; commas advance the
 * current function's argument position.
 *
 * @param {import('@csstools/css-tokenizer').CSSToken[]} tokenList
 * @param {(token: import('@csstools/css-tokenizer').CSSToken, frame: NestingFrame | undefined) => { start: number, end: number, text: string } | undefined} visit
 * @return {Array<{ start: number, end: number, text: string }>}
 */
function collectValueEdits(tokenList, visit) {
  /** @type {NestingFrame[]} */
  const stack = [];
  /** @type {Array<{ start: number, end: number, text: string }>} */
  const edits = [];

  for (const token of tokenList) {
    const type = token[0];
    const frame = stack.at(-1);
    if (type === TokenType.Function) {
      // Match on the decoded name: raw text spells escapes, e.g. a function
      // written `\63 ounter(` has the decoded name "counter".
      const funcName = asciiLowerCase(decoded(token));
      stack.push({
        expectedArgs: COUNTER_STYLE_FUNCTIONS.get(funcName),
        argIndex: 0,
        close: TokenType.CloseParen,
      });
    } else if (type === TokenType.OpenParen) {
      stack.push({ argIndex: 0, close: TokenType.CloseParen });
    } else if (type === TokenType.OpenSquare) {
      stack.push({ argIndex: 0, close: TokenType.CloseSquare });
    } else if (type === TokenType.OpenCurly) {
      stack.push({ argIndex: 0, close: TokenType.CloseCurly });
    } else if (type === frame?.close) {
      stack.pop();
    } else if (type === TokenType.Comma && frame) {
      frame.argIndex++;
    } else {
      const edit = visit(token, frame);
      if (edit) {
        edits.push(edit);
      }
    }
  }

  return edits;
}

/**
 * @param {'animation-shorthand' | 'animation-name'} kind
 * @param {(tokenKey: string) => string | undefined} resolveIdent
 * @param {(tokenKey: string) => string | undefined} resolveString
 * @return {(token: import('@csstools/css-tokenizer').CSSToken, frame: NestingFrame | undefined) => { start: number, end: number, text: string } | undefined}
 */
function createAnimationVisitor(kind, resolveIdent, resolveString) {
  return (token, frame) => {
    // Only top-level tokens name an animation; function arguments belong to
    // other grammar productions.
    if (frame) {
      return undefined;
    }
    if (token[0] === TokenType.Ident) {
      const val = decoded(token);
      const lower = asciiLowerCase(val);
      const isReserved =
        kind === 'animation-shorthand'
          ? KEYFRAMES_SHORTHAND_KEYWORDS.has(lower) || val.startsWith('--')
          : CSS_WIDE_KEYWORDS.has(lower) || lower === 'none';
      if (isReserved) {
        return undefined;
      }
      const rep = resolveIdent(`ident:${val}`);
      return rep === undefined ? undefined : createTokenEdit(token, rep);
    }
    if (token[0] === TokenType.String) {
      const val = /** @type {{value: string}} */ (token[4]).value;
      const rep = resolveString(`str:${val}`);
      return rep === undefined
        ? undefined
        : { start: token[2], end: token[3] + 1, text: rep };
    }
    return undefined;
  };
}

/**
 * @param {(tokenKey: string) => string | undefined} resolveIdent
 * @return {(token: import('@csstools/css-tokenizer').CSSToken, frame: NestingFrame | undefined) => { start: number, end: number, text: string } | undefined}
 */
function createCounterStyleVisitor(resolveIdent) {
  return (token, frame) => {
    if (frame || token[0] !== TokenType.Ident) {
      return undefined;
    }
    const val = decoded(token);
    if (COUNTER_STYLE_RESERVED.has(asciiLowerCase(val))) {
      return undefined;
    }
    const rep = resolveIdent(`ident:${val}`);
    return rep === undefined ? undefined : createTokenEdit(token, rep);
  };
}

/**
 * @param {(tokenKey: string) => string | undefined} resolveIdent
 * @return {(token: import('@csstools/css-tokenizer').CSSToken, frame: NestingFrame | undefined) => { start: number, end: number, text: string } | undefined}
 */
function createCounterFuncVisitor(resolveIdent) {
  return (token, frame) => {
    // Only the counter-style-name argument slots of the recognized counter
    // functions name a counter style.
    if (
      token[0] !== TokenType.Ident ||
      !frame?.expectedArgs?.includes(frame.argIndex)
    ) {
      return undefined;
    }
    const val = decoded(token);
    if (COUNTER_STYLE_RESERVED.has(asciiLowerCase(val))) {
      return undefined;
    }
    const rep = resolveIdent(`ident:${val}`);
    return rep === undefined ? undefined : createTokenEdit(token, rep);
  };
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {NonNullable<ReturnType<typeof classifyDeclaration>>} classification
 * @param {Map<import('postcss').Container, Map<string, FamilyRecord>>} scopes
 * @param {Map<string, FamilyRecord> | null} singleScope
 * @return {void}
 */
function rewriteDeclaration(decl, classification, scopes, singleScope) {
  const value = decl.value;
  const tokenList = tokens(value);
  const target = classification.targetAtRuleName;

  /** @type {import('postcss').Container | undefined} */
  let container;
  /** @param {string} key */
  const resolve = singleScope
    ? (/** @type {string} */ key) =>
        singleScope.get(target)?.resolver?.(key)?.text
    : (/** @type {string} */ key) => {
        if (!container) {
          container = getContainer(decl);
        }
        return lookupScopeChain(scopes, container, target, key);
      };

  /** @type {(token: import('@csstools/css-tokenizer').CSSToken, frame: NestingFrame | undefined) => { start: number, end: number, text: string } | undefined} */
  let visit;
  if (
    classification.kind === 'animation-shorthand' ||
    classification.kind === 'animation-name'
  ) {
    visit = createAnimationVisitor(classification.kind, resolve, resolve);
  } else if (classification.kind === 'counter-style') {
    visit = createCounterStyleVisitor(resolve);
  } else {
    visit = createCounterFuncVisitor(resolve);
  }

  const edits = collectValueEdits(tokenList, visit);

  if (edits.length > 0) {
    const result = applyEdits(value, edits);
    if (result !== value) {
      decl.value = result;
      if (decl.raws?.value?.raw) {
        decl.raws.value = { raw: result, value: result };
      }
    }
  }
}

/**
 * Finds or creates the family record of one at-rule name in one container.
 *
 * @param {Map<import('postcss').Container, Map<string, FamilyRecord>>} scopes
 * @param {import('postcss').Container} container
 * @param {string} name
 * @return {FamilyRecord}
 */
function familyRecordFor(scopes, container, name) {
  let containerScope = scopes.get(container);
  if (!containerScope) {
    containerScope = new Map();
    scopes.set(container, containerScope);
  }
  let familyData = containerScope.get(name);
  if (!familyData) {
    familyData = { entries: [] };
    containerScope.set(name, familyData);
  }
  return familyData;
}

/**
 * @param {import('postcss').Root} css
 * @return {void}
 */
function mergeAtRules(css) {
  const layerRegistry = new LayerRegistry();
  let keyframesCount = 0;
  let counterStyleCount = 0;
  let documentIndex = 0;

  /** @type {Map<import('postcss').Container, Map<string, FamilyRecord>>} */
  const scopes = new Map();

  css.walkAtRules((atRule) => {
    const name = asciiLowerCase(atRule.name);
    if (name === 'layer') {
      layerRegistry.declareLayerAtRule(atRule);
      return;
    }

    const isKeyframes = name.endsWith('keyframes');
    const isCounterStyle = name.endsWith('counter-style');
    if (!isKeyframes && !isCounterStyle) {
      return;
    }

    if (isKeyframes) {
      keyframesCount++;
    } else {
      counterStyleCount++;
    }

    const container = getContainer(atRule);
    const familyData = familyRecordFor(scopes, container, name);

    const parsed = parseAtRuleName(atRule.params, name);
    if (parsed) {
      familyData.entries.push({
        rule: atRule,
        parsed,
        layerPriority: layerRegistry.getPriority(atRule),
        documentIndex: documentIndex++,
      });
    }
  });

  if (keyframesCount < 2 && counterStyleCount < 2) {
    return;
  }

  /** @type {Set<import('postcss').AtRule>} */
  const removals = new Set();
  let hasReplacements = false;

  for (const containerScope of scopes.values()) {
    for (const familyData of containerScope.values()) {
      const result = processAtRuleEntries(familyData.entries, removals);
      familyData.resolver = result.resolver;
      familyData.definedNames = result.definedNames;
      if (result.hasReplacements) {
        hasReplacements = true;
      }
    }
  }

  if (removals.size === 0) {
    return;
  }

  if (hasReplacements) {
    const singleScope =
      scopes.size === 1 ? (scopes.values().next().value ?? null) : null;

    css.walkDecls((decl) => {
      const classification = classifyDeclaration(decl);
      if (classification) {
        rewriteDeclaration(decl, classification, scopes, singleScope);
      }
    });
  }

  for (const node of removals) {
    node.remove();
  }
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-merge-idents',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      mergeAtRules(css);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
