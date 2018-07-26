import * as React from 'react';
import {withPhenomicApi, query} from '@phenomic/preset-react-app/lib/client';

import PagesList from '../../components/PagesList';
import Page from '../Page';

const Blog = ({isLoading, posts, location}) => (
    <Page title="Blog" isLoading={isLoading} { ... posts} url={location.pathname}>
        <PagesList pages={ posts && posts.node && posts.node.list } />
    </Page>
);

export default withPhenomicApi(Blog, props => ({
    posts: query({
        path: "content/blog",
    }),
}));
