import React, {Component, PropTypes} from "react";
import Lowlight from 'react-lowlight';
import js from 'highlight.js/lib/languages/javascript';
import dangerousMd from '../../../scripts/markdownRenderer';
import BasicPage from "../BasicPage";
import {content} from '../Page/index.css';
import styles from './index.css';

Lowlight.registerLanguage('js', js);

export default class Optimisations extends Component {
    static contextTypes = {
        metadata: PropTypes.object.isRequired
    };

    render () {
        const {wrappers} = this.context.metadata;
        return (
            <div>
                <BasicPage className={content} { ...this.props}></BasicPage>
                {wrappers.reduce((list, wrapper) => {
                    let alternate = null;
                    if (wrapper.alternate) {
                        alternate = (
                            <div dangerouslySetInnerHTML={{
                                __html: dangerousMd(`Alternatively, you can use ${wrapper.alternate} to run cssnano in combination with other PostCSS processors. See the documentation for more information.`)
                            }} />
                        );
                    }
                    list.push(
                        <div className={content}>
                            <div dangerouslySetInnerHTML={{
                                __html: dangerousMd(`## ${wrapper.name}`)
                            }} />
                            <div dangerouslySetInnerHTML={{
                                __html: dangerousMd(wrapper.example)
                            }} />
                            <a
                                className={styles.install}
                                href={wrapper.source}
                            >
                                {wrapper.install}
                            </a>
                            {alternate}
                        </div>
                    );
                    return list;
                }, [])}
            </div>
        );
    }
}
