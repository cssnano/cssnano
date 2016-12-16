import React, {PropTypes} from "react";
import ClipboardButton from 'react-clipboard.js';
import ClipboardIcon from 'react-clipboard-icon';

const Clipboard = ({text}) => (
    <ClipboardButton data-clipboard-text={text}>
        <span><ClipboardIcon /> Copy</span>
    </ClipboardButton>
);

Clipboard.propTypes = {
    text: PropTypes.string.isRequired,
};

export default Clipboard;
