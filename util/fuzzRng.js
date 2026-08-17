'use strict';

/**
 * A Lehmer (multiplicative-congruential) generator.
 *
 * Plain modular multiplication is more than enough randomness
 * for the shallow corpora the per-package fuzzers build.
 *
 * @param {number} seed
 * @return {{int: (bound: number) => number, pick: <T>(items: readonly T[]) => T, chance: (probability: number) => boolean}}
 */
function random(seed) {
  const modulus = 2147483647;
  let state = (Math.trunc(Math.abs(seed)) % (modulus - 1)) + 1;

  const next = () => {
    state = (state * 48271) % modulus;
    return (state - 1) / (modulus - 1);
  };

  return {
    int: (bound) => Math.floor(next() * bound),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (probability) => next() < probability,
  };
}

module.exports = { random };
