import React, {Component, PropTypes} from "react";
import Lowlight from 'react-lowlight';
import js from 'highlight.js/lib/languages/javascript';
import DangerousMarkdown from '../../DangerousMarkdown';
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
                {wrappers.reduce((list, wrapper, index) => {
                    let alternate = null;
                    if (wrapper.alternate) {
                        alternate = (
                            <DangerousMarkdown>
                                {`Alternatively, you can use ${wrapper.alternate} to run cssnano in combination with other PostCSS processors. See the documentation for more information.`}
                            </DangerousMarkdown>
                        );
                    }
                    let clipboard = null;
                    if (typeof window !== 'undefined') {
                        const Clipboard = require('./clipboard').default;
                        clipboard = (<Clipboard text={wrapper.install}/>);
                    }
                    list.push(
                        <div className={content} key={index}>
                            <DangerousMarkdown>
                                {`## ${wrapper.name}`}
                            </DangerousMarkdown>
                            <DangerousMarkdown>
                                {wrapper.example}
                            </DangerousMarkdown>
                            <div className={styles.install}>
                                <a href={wrapper.source}>{wrapper.install}</a>
                                {clipboard}
                            </div>
                            {alternate}
                        </div>
                    );
                    return list;
                }, [])}
            </div>
        );
    }
}
