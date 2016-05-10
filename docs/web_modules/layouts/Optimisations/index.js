import React, {Component, PropTypes} from "react";
import Lowlight from 'react-lowlight';
import js from 'highlight.js/lib/languages/javascript';
import dangerousMd, {react as md} from '../../../scripts/markdownRenderer.babel';
import CssExample from '../../CssExample';
import {example} from '../../CssExample/index.css';
import BasicPage from "../BasicPage";
import {content} from '../Page/index.css';
import styles from './index.css';

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
            <div className={content}>
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
            {modules.reduce((list, feature, index) => {
                let demo = null;
                if (feature.inputExample && feature.outputExample) {
                    demo = <div className={example}>
                        <CssExample css={feature.inputExample} />
                        <CssExample css={feature.outputExample} />
                    </div>;
                }
                let className = [];
                if (feature.safe === false) {
                    className.push(styles.unsafe);
                }
                list.push(
                    <div key={index} className={[...className, content].join(' ')}>
                        <div dangerouslySetInnerHTML={{
                            __html: dangerousMd(`## ${feature.shortName}`)
                        }} />
                        {md(feature.longDescription)}
                        {demo}
                        <p><a href={feature.source}>View on GitHub</a></p>
                    </div>
                );
                return list;
            }, [])}
            </div>
        );
    }
}
