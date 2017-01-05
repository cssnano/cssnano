import React, {Component, PropTypes} from "react";
import BasicPage from "../BasicPage";
import {content} from '../Page/index.css';
import CssExample from '../../CssExample';
import {example} from '../../CssExample/index.css';
import DangerousMarkdown from '../../DangerousMarkdown';

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
        const module = modules.find(m => m.shortName.toLowerCase() === identifier.toLowerCase());

        const {
            inputExample,
            outputExample,
            tipDescription,
            tipInput,
            tipOutput,
            source,
        } = module;

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
                <div className={content}>
                    <h2>Did you know...</h2>
                    <DangerousMarkdown>{tipDescription}</DangerousMarkdown>
                    {tipExample}
                </div>
            );
        }

        return (
            <div>
                <BasicPage className={content} { ...this.props} />
                <div className={content}>
                    {demo}
                    <p><a href={source}>View on GitHub</a></p>
                </div>
                {tip}
            </div>
        );
    }
}
