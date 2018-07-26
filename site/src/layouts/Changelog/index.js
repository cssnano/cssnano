import * as React from 'react';
import {withPhenomicApi, query} from '@phenomic/preset-react-app/lib/client';

import Page from '../Page';
import PageError from '../PageError';

const Changelog = (props) => {
    const {isLoading, page} = props;
    const node = page && page.node;
    if (page.error) {
        return <PageError />;
    }
    return (
        <Page isLoading={isLoading} { ...node } url={props.location.pathname} />
    );
};

export default withPhenomicApi(Changelog, props => ({
    page: query({
        path: "content",
        id: "changelog",
    }),
}));
