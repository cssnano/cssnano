import * as React from 'react';
import {Link} from 'react-router';
import {withPhenomicApi, query, BodyRenderer} from '@phenomic/preset-react-app/lib/client';

import ContentBlock from '../../components/ContentBlock';
import CssExample from '../../components/CssExample';
import Page from '../Page';
import PageError from '../PageError';

import data from '../../metadata';

import {example} from '../../components/CssExample/index.css';
import styles from './index.css';

const Optimisation = ({isLoading, page, location}) => {
    const node = page && page.node;
    if (page.error) {
        return <PageError />;
    }

    const {identifier} = node;
    const {modules} = data;

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
                    <li>Changes semantics</li>,
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
                <BodyRenderer>{tipDescription}</BodyRenderer>
                {tipExample}
            </ContentBlock>
        );
    }
    
    return (
        <div>
            <Page isLoading={isLoading} { ...node } url={location.pathname} />
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
};

export default withPhenomicApi(Optimisation, props => ({
    page: query({
        path: "content/optimisations",
        id:  props.params.splat,
    }),
}));
