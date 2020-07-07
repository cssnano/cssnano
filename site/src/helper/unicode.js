// https://github.com/eslint/website/blob/22488d817a09f0bacea3b32c82c8bc7dd72eb2d9/src/js/demo/utils/unicode.js

export default {
  encodeToBase64(text) {
    return window.btoa(unescape(encodeURIComponent(text)));
  },

  decodeFromBase64(base64) {
    return decodeURIComponent(escape(window.atob(base64)));
  },
};
