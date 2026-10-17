// caniuse-lite ships no types; this covers the part that cssnano reads.
// A feature's support table comes in a compressed object form.

declare module 'caniuse-lite' {
  export const agents: Record<string, { versions: (string | null)[] }>;
  export const features: Record<string, Record<string, unknown>>;
  export function feature(packed: Record<string, unknown>): {
    stats: Record<string, Record<string, string>>;
  };
}

declare module 'caniuse-lite/data/features/*' {
  const packed: Record<string, unknown>;
  export default packed;
}

declare module 'caniuse-lite/dist/unpacker/feature.js' {
  export default function unpackFeature(packed: Record<string, unknown>): {
    stats: Record<string, Record<string, string>>;
  };
}

declare module 'caniuse-lite/dist/unpacker/agents.js' {
  export const agents: Record<string, { versions: (string | null)[] }>;
}
