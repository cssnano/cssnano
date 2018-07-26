import * as React from 'react';
import {withPhenomicApi, query} from '@phenomic/preset-react-app/lib/client';

import Page from '../Page';
import PageError from '../PageError';

const Community = ({isLoading, page, location}) => {
    const node = page && page.node;
    if (page.error) {
        return <PageError />;
    }
    return (
        <Page isLoading={isLoading} { ...node } url={location.pathname} />
    );
};

export default withPhenomicApi(Community, props => ({
    page: query({
        path: "content",
        id: "community",
    }),
}));
