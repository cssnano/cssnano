import type { Guard } from './optionGuards.js';
/** @import {Guard} from './optionGuards.js' */
/**
 * The browser targets, which every target-reading plugin shares. Each key
 * matches browserslist's option of the same name, except query, which is its
 * positional queries argument. An unset path is the PostCSS from.
 */
/** @type {Readonly<Record<string, Guard>>} */
export declare const browserslistOptions: Readonly<Record<string, Guard>>;
/**
 * Browserslist options that cssnano refuses. Forwarding one would change what a
 * project config may load, so a user who writes one gets the reason.
 * @type {Readonly<Record<string, string>>}
 */
export declare const refusedBrowserslistOptions: Readonly<Record<string, string>>;
/**
 * An unknown browserslist key throws rather than being reported, because
 * ignoring it would change the browser targets that the user asked for.
 * @param {Record<string, unknown>} browserslist
 * @returns {Record<string, unknown>}
 */
export declare function validateBrowserslist(browserslist: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=browserslistOptions.d.ts.map