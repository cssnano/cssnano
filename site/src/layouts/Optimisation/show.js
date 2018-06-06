import React, {Component, PropTypes} from "react";
import {Link} from "phenomic";
import Page from "../Page";
import CssExample from '../../components/CssExample';
import {example} from '../../components/CssExample/index.css';
import ContentBlock from '../../components/ContentBlock';
import DangerousMarkdown from '../../components/DangerousMarkdown';
import styles from './index.css';

export default class Optimisation extends Component {
    static contextTypes = {
        metadata: PropTypes.object.isRequired
    };

    static propTypes = {
        head: PropTypes.object,
        params: PropTypes.object,
    };

    render () {
        const {identifier} = this.props.head;
        const {modules} = this.context.metadata;
        const module = Object.keys(modules).find(m => {
            const {shortName} = modules[m];
            return shortName.toLowerCase() === identifier.toLowerCase();
        });

        const {
            inputExample,
            outputExample,
            tipDescription,
            tipInput,
            tipOutput,
            source,
            safe,
        } = modules[module];

        let safeContent = null;

        if (safe) {
            safeContent = (<ContentBlock className={styles.risks}>
                <h2>⚠ Risk of breakage</h2>
                <p>This transform may be unsafe in certain situations, because
                    of the following condition(s):</p>
                <ul>
                    {[
                        <li>Assumes concatenation</li>,
                        <li>Changes semantics</li>
                    ].filter((el, index) => {
                        if (index === 0 && (safe & 1) !== 0) {
                            return true;
                        }
                        if (index === 1 && (safe & 2) !== 0) {
                            return true;
                        }
                        return false;
                    })}
                </ul>
                <p>For more information,
                    see our <Link to={`/guides/advanced-transforms`}>advanced transforms guide</Link>.</p>
            </ContentBlock>);
        }

        let demo = null;
        if (inputExample && outputExample) {
            demo = <div className={example}>
                <CssExample key={`input`}>{inputExample}</CssExample>
                <CssExample key={`output`}>{outputExample}</CssExample>
            </div>;
        }

        let tip = null;
        if (tipDescription) {
            let tipExample = null;
            if (tipInput && tipOutput) {
                tipExample = <div className={example}>
                    <CssExample key={`input`}>{tipInput}</CssExample>
                    <CssExample key={`output`}>{tipOutput}</CssExample>
                </div>;
            }
            tip = (
                <ContentBlock>
                    <h2>Did you know...</h2>
                    <DangerousMarkdown>{tipDescription}</DangerousMarkdown>
                    {tipExample}
                </ContentBlock>
            );
        }

        return (
            <div>
                <Page { ...this.props} />
                <ContentBlock>
                    {demo}
                </ContentBlock>
                {safeContent}
                <ContentBlock>
                    <p><a href={source}>View on GitHub</a></p>
                </ContentBlock>
                {tip}
            </div>
        );
    }
}
