import { packedFeatures } from '../../src/utils/featureKeys.js';

/** @import {FeatureKey} from '../../src/utils/featureKeys.js' */

/** Every feature that supportsAll accepts, for tests that sweep all of them. */
export const featureKeys = Object.freeze(
  /** @type {FeatureKey[]} */ (Object.keys(packedFeatures))
);
