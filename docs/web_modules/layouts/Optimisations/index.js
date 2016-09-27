import React, {Component, PropTypes} from "react";
import Lowlight from 'react-lowlight';
import {Link} from 'react-router';
import js from 'highlight.js/lib/languages/javascript';
import BasicPage from "../BasicPage";
import styles from '../Homepage/index.css';
import {content} from '../Page/index.css';

Lowlight.registerLanguage('js', js);

const optionsExample = `{
    discardComments: {
        removeAll: true
    }
}`;

const disableExample = `{
    discardComments: false
}`;

export default class Optimisations extends Component {
    static contextTypes = {
        metadata: PropTypes.object.isRequired
    };

    render () {
        const {modules} = this.context.metadata;
        return (
            <div>
            <BasicPage className={content} { ...this.props}></BasicPage>
            <div className={content} key={1}>
                <ul className={styles.features}>
                    {modules.map((feature, index) => {
                        return (
                            <li key={index}>
                                <Link to={`/optimisations/${feature.shortName}`}>
                                    {feature.shortName}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
            <div className={content} key={2}>
                <p>Note that it is possible to pass options to, or disable, any
                of the bundled transforms. Simply pass the module name as documented
                here, with an options object to customise the behaviour, or <code>false</code> to
                disable completely. For example, to remove all comments, you can do:</p>
                <Lowlight
                  language="js"
                  value={optionsExample}
                />
                <p>If you would like to keep all comments, you can pass this
                options object instead:</p>
                <Lowlight
                  language="js"
                  value={disableExample}
                />
                <p>All examples aside from <code>core</code> are formatted with
                semicolons and whitespace, to aid readability.</p>
            </div>
            </div>
        );
    }
}
