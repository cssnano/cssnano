import React, {PropTypes, Component} from "react";
import BasicPage from "../BasicPage";
import PageError from '../PageError';
import {content} from '../Page/index.css';
import DangerousMarkdown from '../../DangerousMarkdown';
import CssExample from '../../CssExample';
import {example} from '../../CssExample/index.css';

export default class OptimisationsContainer extends Component {
    static contextTypes = {
        metadata: PropTypes.object.isRequired
    };

    static propTypes = {
        params: PropTypes.object,
    };

    render () {
        const {optimisation} = this.props.params;
        const {modules} = this.context.metadata;
        const module = modules.filter(m => m.shortName.toLowerCase() === optimisation.toLowerCase());

        if (!module[0]) {
            return (<PageError />);
        }

        const {
            shortName,
            safe,
            inputExample,
            outputExample,
            longDescription,
            source,
        } = module[0];

        let title = shortName;

        if (safe === false) {
            title += ` (unsafe)`;
        }

        const params = {
            __filename: `optimisations/${shortName}.md`,
            __url: `optimisations/${shortName}`,
            head: {
                title,
            },
            body: '',
        };

        let demo = null;
        if (inputExample && outputExample) {
            demo = <div className={example}>
                <CssExample key={`input`}>{inputExample}</CssExample>
                <CssExample key={`output`}>{outputExample}</CssExample>
            </div>;
        }

        return (
            <div>
                <BasicPage {...params} className={content}></BasicPage>
                <div className={content}>
                    <DangerousMarkdown>{longDescription}</DangerousMarkdown>
                    {demo}
                    <p><a href={source}>View on GitHub</a></p>
                </div>
            </div>
        );
    }
}
