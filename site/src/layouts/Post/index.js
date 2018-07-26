import * as React from 'react';
import {withPhenomicApi, query} from '@phenomic/preset-react-app/lib/client';

import Page from '../Page';
import PageError from '../PageError';

const Post = ({page}) => {
    if (page.error) {
        return <PageError />;
    }
    const node = page && page.node;
    const pageDate = node ? new Date(node.date) : null;

    return (
        <Page
            {...node}
            header={
                <header>
                    {
                        pageDate &&
                    <time key={pageDate.toISOString()}>
                        {pageDate.toDateString()}
                    </time>
                    }
                </header>
            }
        />
    );
};

export default withPhenomicApi(Post, props => ({
    page: query({
        path: "content/blog",
        id: props.params.splat,
    }),
}));
