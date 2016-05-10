import React, {Component, PropTypes} from "react";
import Helmet from 'react-helmet';
import {about} from '../Homepage/index.css';

export default class PageError extends Component {
    static contextTypes = {
        metadata: PropTypes.object.isRequired
    };

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
        
        const {favicons} = this.context.metadata;

        return (
            <div>
                <Helmet
                    title={`${errorText} (${error})`}
                    link={favicons}
                />
                <div className={about}>
                    <p>{errorText} ({error})</p>
                    <p>That’s all she wrote...</p>
                </div>
            </div>
        );
    }
}
