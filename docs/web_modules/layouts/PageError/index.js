import React, {Component, PropTypes} from "react";
import {about} from '../Homepage/index.css';

export default class PageError extends Component {

    static propTypes = {
        error: PropTypes.oneOfType([ PropTypes.number, PropTypes.string ]),
        errorText: PropTypes.string,
    };

    static defaultProps = {
        error: 404,
        errorText: "Page not found",
    };

    render () {
        const {
            error,
            errorText,
        } = this.props;

        return (
            <div>
                <div className={about}>
                    <p>{errorText} ({error})</p>
                    <p>That’s all she wrote...</p>
                </div>
            </div>
        );
    }
}
