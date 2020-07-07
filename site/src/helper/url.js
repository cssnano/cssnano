import Unicode from './unicode';

/* eslint-disable import/prefer-default-export */
export function getUrlState() {
  try {
    return JSON.parse(
      Unicode.decodeFromBase64(window.location.hash.replace(/^#/u, ''))
    );
  } catch (err) {
    return null;
  }
}
