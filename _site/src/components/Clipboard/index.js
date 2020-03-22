import * as React from 'react';
import ClipboardButton from 'react-clipboard.js';
import ClipboardIcon from 'react-clipboard-icon';

const Clipboard = ({ children }) => {
  if (typeof window === 'undefined') {
    return null;
  }
  return (
    <ClipboardButton data-clipboard-text={children}>
      <span>
        <ClipboardIcon /> Copy
      </span>
    </ClipboardButton>
  );
};

export default Clipboard;
