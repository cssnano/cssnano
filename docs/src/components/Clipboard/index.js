import React, {Component} from "react";
import PropTypes from "prop-types";
import ClipboardButton from 'react-clipboard.js';
import ClipboardIcon from 'react-clipboard-icon';

export default class Clipboard extends Component {
    static propTypes = {
        children: PropTypes.string.isRequired,
    };

    render () {
        if (typeof window === 'undefined') {
            return null;
        }
        const {children} = this.props;
        return (
            <ClipboardButton data-clipboard-text={children}>
                <span><ClipboardIcon /> Copy</span>
            </ClipboardButton>
        );
    }
}
