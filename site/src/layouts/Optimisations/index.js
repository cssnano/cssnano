import * as React from 'react';
import {withPhenomicApi, query} from '@phenomic/preset-react-app/lib/client';

import Page from '../Page';

const Optimisations = ({isLoading, page, location}) => {
    const node = page && page.node;
    return (
        <Page isLoading={isLoading} { ...node } url={location.pathname} />
    );
};

export default withPhenomicApi(Optimisations, props => ({
    page: query({
        path: "content",
        id: "optimisations",
    }),
}));
