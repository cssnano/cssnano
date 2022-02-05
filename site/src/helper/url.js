import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import Unicode from './unicode';

export function getUrlState() {
  const maxHashLength = 300000;
  const validConfigs = new Set([
    'cssnano-preset-lite',
    'cssnano-preset-default',
    'cssnano-preset-advanced',
  ]);

  if (ExecutionEnvironment.canUseDOM) {
    /* Reject huge hashes
   (longer than the whole Bootstrap CSS) */
    if (window.location.hash.length > maxHashLength) {
      return null;
    }
    try {
      const parsed = JSON.parse(
        Unicode.decodeFromBase64(window.location.hash.replace(/^#/u, ''))
      );
      if (Object.keys(parsed).length > 2) {
        return null;
      }
      if (!validConfigs.has(parsed.config)) {
        return null;
      }
      if (typeof parsed.input !== 'string') {
        return null;
      }
      return parsed;
    } catch (err) {
      return null;
    }
  } else {
    return null;
  }
}
